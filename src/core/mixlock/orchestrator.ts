import type { MasterRepository } from "../master";
import {
  evaluateMetamerismGate,
  type IlluminantDeltaEvidence,
  type MetamerismEvidence,
  type MetamerismThresholds,
} from "../metamerism";
import { runSpectralScissorLockPipeline, type ScissorLockPipelineEvidence } from "../scissor";
import { evaluateMixLockCandidate, type MixLockCandidateEvidence, type MixLockPigmentInput } from "./evaluate";
import { solveSecondRecipe, type SecondRecipeEvidence, type SecondRecipeSolverOptions } from "./second-recipe";

export type FinalMixLockStatus =
  | "REFERENCE_LOCKED_METAMERISM_LOW"
  | "REFERENCE_LOCKED_METAMERISM_WARNING"
  | "REFERENCE_LOCKED_METAMERISM_RISK"
  | "MIXLOCK_UNLOCKED"
  | "MIXLOCK_INVALID";

export interface FinalMixLockOptions {
  readonly allowedLambdaDriftNm: number;
  readonly metamerismThresholds: MetamerismThresholds;
  readonly secondRecipe?: SecondRecipeSolverOptions;
}

export interface FinalMixLockEvidence {
  readonly status: FinalMixLockStatus;
  readonly targetReference: string;
  readonly initialCandidate: MixLockCandidateEvidence;
  readonly scissor: ScissorLockPipelineEvidence;
  readonly secondRecipe?: SecondRecipeEvidence;
  readonly metamerism?: MetamerismEvidence;
  readonly finalVerdict: "FINAL_REFERENCE_LOCK" | "NOT_FINAL";
  readonly limitations: readonly string[];
}

export async function runFinalMixLock(
  repository: MasterRepository,
  targetReference: string,
  pigments: readonly MixLockPigmentInput[],
  metamerismEvaluations: readonly IlluminantDeltaEvidence[],
  options: FinalMixLockOptions,
): Promise<FinalMixLockEvidence> {
  const initialCandidate = await evaluateMixLockCandidate(repository, targetReference, pigments);
  const scissor = await runSpectralScissorLockPipeline(
    repository,
    targetReference,
    initialCandidate.candidateSpectrum,
    { allowedLambdaDriftNm: options.allowedLambdaDriftNm },
  );

  const limitations = [
    "Pigment spectra remain candidate-space inputs and are not ARBE identities.",
    "Kubelka–Munk is an opaque infinite-layer approximation.",
    "The second-recipe search is deterministic but does not prove a global optimum.",
    "Metamerism evidence is supplied by an upstream multi-illuminant calculator.",
    "Not a production approval.",
  ] as const;

  if (scissor.status === "SCISSOR_INVALID") {
    return {
      status: "MIXLOCK_INVALID",
      targetReference,
      initialCandidate,
      scissor,
      finalVerdict: "NOT_FINAL",
      limitations,
    };
  }
  if (scissor.status !== "SCISSOR_LOCKED" || !scissor.correction) {
    return {
      status: "MIXLOCK_UNLOCKED",
      targetReference,
      initialCandidate,
      scissor,
      finalVerdict: "NOT_FINAL",
      limitations,
    };
  }

  const secondRecipe = await solveSecondRecipe(
    repository,
    targetReference,
    scissor.correction.correctedSpectrum,
    pigments,
    options.secondRecipe ?? {},
  );
  const referenceLocked =
    secondRecipe.atlasFit.status === "REFERENCE_LOCKED" &&
    secondRecipe.atlasFit.nearestReference === targetReference &&
    secondRecipe.atlasFit.targetRank === 1;

  if (!referenceLocked) {
    return {
      status: "MIXLOCK_UNLOCKED",
      targetReference,
      initialCandidate,
      scissor,
      secondRecipe,
      finalVerdict: "NOT_FINAL",
      limitations,
    };
  }

  const metamerism = evaluateMetamerismGate(
    targetReference,
    true,
    metamerismEvaluations,
    options.metamerismThresholds,
  );

  if (metamerism.status === "METAMERISM_INVALID") {
    return {
      status: "MIXLOCK_INVALID",
      targetReference,
      initialCandidate,
      scissor,
      secondRecipe,
      metamerism,
      finalVerdict: "NOT_FINAL",
      limitations,
    };
  }

  return {
    status: metamerism.status,
    targetReference,
    initialCandidate,
    scissor,
    secondRecipe,
    metamerism,
    finalVerdict: "FINAL_REFERENCE_LOCK",
    limitations,
  };
}
