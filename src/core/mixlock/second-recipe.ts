import { evaluateAtlasFit, type AtlasFitEvidence, type CandidateSpectrum } from "../atlasfit";
import type { MasterRepository } from "../master";
import { mixReflectanceKm, normalizeWeights } from "../mix/kubelka-munk";
import type { MixLockPigmentInput } from "./evaluate";

const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export interface SecondRecipeSolverOptions {
  readonly initialStep?: number;
  readonly minimumStep?: number;
  readonly maxPassesPerStep?: number;
}

export interface SecondRecipeEvidence {
  readonly status: "SECOND_RECIPE_CANDIDATE_SOLVED";
  readonly targetReference: string;
  readonly objective: "SPECTRAL_RMSE_TO_SCISSORED_TARGET";
  readonly recipe: readonly {
    readonly pigmentId: string;
    readonly normalizedWeight: number;
  }[];
  readonly scissoredTargetSpectrum: CandidateSpectrum;
  readonly candidateSpectrum: CandidateSpectrum;
  readonly spectralRmseToScissoredTarget: number;
  readonly atlasFit: AtlasFitEvidence;
  readonly solver: {
    readonly method: "DETERMINISTIC_PAIRWISE_WEIGHT_TRANSFER";
    readonly initialStep: number;
    readonly minimumStep: number;
    readonly maxPassesPerStep: number;
    readonly evaluatedCandidates: number;
    readonly completedPasses: number;
  };
  readonly verdict: "SECOND_RECIPE_CANDIDATE";
  readonly limitations: readonly string[];
}

function assertSpectrum(spectrum: CandidateSpectrum, label: string): void {
  if (spectrum.wavelengthsNm.length !== 36 || spectrum.reflectance.length !== 36) {
    throw new Error(`${label} must contain exactly 36 spectral bands.`);
  }
  for (let index = 0; index < 36; index += 1) {
    if (spectrum.wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new Error(`${label} must use the canonical 380–730 nm / 10 nm grid.`);
    }
    const value = spectrum.reflectance[index];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${label} reflectance[${index}] must be within 0..1.`);
    }
  }
}

function assertPigment(pigment: MixLockPigmentInput, index: number): void {
  if (!pigment.id.trim()) throw new Error(`Pigment ${index} requires a non-empty id.`);
  assertSpectrum(pigment.spectrum, `Pigment ${pigment.id}`);
}

function rmse(left: readonly number[], right: readonly number[]): number {
  const mse = left.reduce((sum, value, index) => {
    const difference = value - right[index];
    return sum + difference * difference;
  }, 0) / left.length;
  return Math.sqrt(mse);
}

function mixedSpectrum(pigments: readonly MixLockPigmentInput[], weights: readonly number[]): CandidateSpectrum {
  return {
    wavelengthsNm: EXPECTED_WAVELENGTHS,
    reflectance: mixReflectanceKm(
      pigments.map((pigment) => pigment.spectrum.reflectance),
      weights,
    ),
  };
}

export async function solveSecondRecipe(
  repository: MasterRepository,
  targetReference: string,
  scissoredTargetSpectrum: CandidateSpectrum,
  pigments: readonly MixLockPigmentInput[],
  options: SecondRecipeSolverOptions = {},
): Promise<SecondRecipeEvidence> {
  if (pigments.length < 1) throw new Error("At least one pigment candidate is required.");
  assertSpectrum(scissoredTargetSpectrum, "Scissored target spectrum");
  pigments.forEach(assertPigment);

  const initialStep = options.initialStep ?? 0.25;
  const minimumStep = options.minimumStep ?? 0.001;
  const maxPassesPerStep = options.maxPassesPerStep ?? 100;
  if (!Number.isFinite(initialStep) || initialStep <= 0 || initialStep > 1) {
    throw new Error("initialStep must be greater than zero and at most one.");
  }
  if (!Number.isFinite(minimumStep) || minimumStep <= 0 || minimumStep > initialStep) {
    throw new Error("minimumStep must be greater than zero and no larger than initialStep.");
  }
  if (!Number.isInteger(maxPassesPerStep) || maxPassesPerStep < 1) {
    throw new Error("maxPassesPerStep must be a positive integer.");
  }

  let weights = normalizeWeights(
    pigments.map((pigment) => (Number.isFinite(pigment.weight) && pigment.weight >= 0 ? pigment.weight : 0)),
  );
  let spectrum = mixedSpectrum(pigments, weights);
  let bestRmse = rmse(spectrum.reflectance, scissoredTargetSpectrum.reflectance);
  let evaluatedCandidates = 1;
  let completedPasses = 0;

  for (let step = initialStep; step >= minimumStep; step /= 2) {
    let improved = true;
    let passesAtStep = 0;
    while (improved && passesAtStep < maxPassesPerStep) {
      improved = false;
      passesAtStep += 1;
      completedPasses += 1;

      for (let donor = 0; donor < weights.length; donor += 1) {
        for (let receiver = 0; receiver < weights.length; receiver += 1) {
          if (donor === receiver || weights[donor] < step) continue;
          const trial = [...weights];
          trial[donor] -= step;
          trial[receiver] += step;
          const trialSpectrum = mixedSpectrum(pigments, trial);
          const trialRmse = rmse(trialSpectrum.reflectance, scissoredTargetSpectrum.reflectance);
          evaluatedCandidates += 1;
          if (trialRmse + 1e-15 < bestRmse) {
            weights = trial;
            spectrum = trialSpectrum;
            bestRmse = trialRmse;
            improved = true;
          }
        }
      }
    }
  }

  const atlasFit = await evaluateAtlasFit(repository, targetReference, spectrum);
  return {
    status: "SECOND_RECIPE_CANDIDATE_SOLVED",
    targetReference,
    objective: "SPECTRAL_RMSE_TO_SCISSORED_TARGET",
    recipe: pigments.map((pigment, index) => ({
      pigmentId: pigment.id,
      normalizedWeight: weights[index],
    })),
    scissoredTargetSpectrum,
    candidateSpectrum: spectrum,
    spectralRmseToScissoredTarget: bestRmse,
    atlasFit,
    solver: {
      method: "DETERMINISTIC_PAIRWISE_WEIGHT_TRANSFER",
      initialStep,
      minimumStep,
      maxPassesPerStep,
      evaluatedCandidates,
      completedPasses,
    },
    verdict: "SECOND_RECIPE_CANDIDATE",
    limitations: [
      "The solver performs deterministic local pairwise weight transfer and does not prove a global optimum.",
      "Kubelka–Munk K/S mixing is an opaque infinite-layer approximation.",
      "No substrate, scattering, concentration-series or wet-to-dry calibration applied.",
      "Pigment inputs remain candidate-space data and are not ARBE reference identities.",
      "The Metamerism Gate has not been performed.",
      "Not a production approval.",
    ],
  };
}
