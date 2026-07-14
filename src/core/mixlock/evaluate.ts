import { evaluateAtlasFit, type AtlasFitEvidence } from "../atlasfit";
import { mixReflectanceKm } from "../mix/kubelka-munk";
import type { MasterRepository } from "../master";

const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export interface MixLockPigmentInput {
  readonly id: string;
  readonly spectrum: {
    readonly wavelengthsNm: readonly number[];
    readonly reflectance: readonly number[];
  };
  readonly weight: number;
}

export interface MixLockCandidateEvidence {
  readonly status: "MIX_CANDIDATE_EVALUATED";
  readonly targetReference: string;
  readonly recipe: readonly {
    readonly pigmentId: string;
    readonly normalizedWeight: number;
  }[];
  readonly candidateSpectrum: {
    readonly wavelengthsNm: readonly number[];
    readonly reflectance: readonly number[];
  };
  readonly atlasFit: AtlasFitEvidence;
  readonly verdict: "RECIPE_CANDIDATE";
  readonly limitations: readonly string[];
}

function assertPigment(input: MixLockPigmentInput, index: number): void {
  if (!input.id.trim()) throw new Error(`Pigment ${index} requires a non-empty id.`);
  if (!Number.isFinite(input.weight) || input.weight < 0) {
    throw new Error(`Pigment ${input.id} weight must be finite and non-negative.`);
  }
  if (
    input.spectrum.wavelengthsNm.length !== 36 ||
    input.spectrum.reflectance.length !== 36
  ) {
    throw new Error(`Pigment ${input.id} spectrum must contain exactly 36 bands.`);
  }
  input.spectrum.wavelengthsNm.forEach((value, band) => {
    if (value !== EXPECTED_WAVELENGTHS[band]) {
      throw new Error(`Pigment ${input.id} must use the canonical spectral grid.`);
    }
    const reflectance = input.spectrum.reflectance[band];
    if (!Number.isFinite(reflectance) || reflectance < 0 || reflectance > 1) {
      throw new Error(`Pigment ${input.id} reflectance[${band}] must be within 0..1.`);
    }
  });
}

export async function evaluateMixLockCandidate(
  repository: MasterRepository,
  targetReference: string,
  pigments: readonly MixLockPigmentInput[],
): Promise<MixLockCandidateEvidence> {
  if (pigments.length < 1) throw new Error("At least one pigment candidate is required.");
  pigments.forEach(assertPigment);

  const totalWeight = pigments.reduce((sum, pigment) => sum + pigment.weight, 0);
  if (totalWeight <= 0) throw new Error("At least one pigment weight must be greater than zero.");

  const normalizedWeights = pigments.map((pigment) => pigment.weight / totalWeight);
  const reflectance = mixReflectanceKm(
    pigments.map((pigment) => pigment.spectrum.reflectance),
    pigments.map((pigment) => pigment.weight),
  );
  const candidateSpectrum = {
    wavelengthsNm: EXPECTED_WAVELENGTHS,
    reflectance,
  } as const;
  const atlasFit = await evaluateAtlasFit(repository, targetReference, candidateSpectrum);

  return {
    status: "MIX_CANDIDATE_EVALUATED",
    targetReference,
    recipe: pigments.map((pigment, index) => ({
      pigmentId: pigment.id,
      normalizedWeight: normalizedWeights[index],
    })),
    candidateSpectrum,
    atlasFit,
    verdict: "RECIPE_CANDIDATE",
    limitations: [
      "Kubelka–Munk K/S mixing is an opaque infinite-layer approximation.",
      "No substrate, scattering, concentration-series or wet-to-dry calibration applied.",
      "Pigment inputs are candidate-space data and are not ARBE reference identities.",
      "Mandatory Spectral Scissor has not been performed.",
      "No second recipe solution has been performed.",
      "No Metamerism Gate has been performed.",
      "Not a production approval.",
    ],
  };
}
