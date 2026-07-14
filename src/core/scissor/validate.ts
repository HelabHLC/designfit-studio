import { evaluateAtlasFit, type AtlasFitEvidence, type CandidateSpectrum } from "../atlasfit";
import type { MasterRepository } from "../master";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type ScissorStatus = "SCISSOR_LOCKED" | "SCISSOR_UNLOCKED" | "SCISSOR_INVALID";

export interface ScissorValidationInput {
  readonly targetReference: string;
  readonly correctedTargetCurve: CandidateSpectrum;
  readonly crossingsBefore: number;
  readonly crossingsAfter: number;
  readonly nearestAfterCorrection: string;
  readonly deltaDeltaLambdaNm: number;
  readonly allowedLambdaDriftNm: number;
}

export interface ScissorEvidence {
  readonly status: ScissorStatus;
  readonly targetReference: string;
  readonly crossingsBefore: number;
  readonly crossingsAfter: number;
  readonly nearestAfterCorrection: string;
  readonly deltaDeltaLambdaNm: number;
  readonly allowedLambdaDriftNm: number;
  readonly atlasFit?: AtlasFitEvidence;
  readonly conditions: {
    readonly noCrossingsAfter: boolean;
    readonly nearestReferencePreserved: boolean;
    readonly lambdaDriftWithinLimit: boolean;
  };
  readonly limitations: readonly string[];
}

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export async function validateSpectralScissor(
  repository: MasterRepository,
  input: ScissorValidationInput,
): Promise<ScissorEvidence> {
  const invalid =
    !REFERENCE_PATTERN.test(input.targetReference) ||
    !REFERENCE_PATTERN.test(input.nearestAfterCorrection) ||
    !nonNegativeInteger(input.crossingsBefore) ||
    !nonNegativeInteger(input.crossingsAfter) ||
    !Number.isFinite(input.deltaDeltaLambdaNm) ||
    !Number.isFinite(input.allowedLambdaDriftNm) ||
    input.allowedLambdaDriftNm < 0;

  const limitations = [
    "This gate validates supplied Scissor evidence; it does not yet compute the correction algorithm.",
    "No second recipe solution has been performed.",
    "No Metamerism Gate has been performed.",
    "Not a production approval.",
  ] as const;

  if (invalid) {
    return {
      status: "SCISSOR_INVALID",
      targetReference: input.targetReference,
      crossingsBefore: input.crossingsBefore,
      crossingsAfter: input.crossingsAfter,
      nearestAfterCorrection: input.nearestAfterCorrection,
      deltaDeltaLambdaNm: input.deltaDeltaLambdaNm,
      allowedLambdaDriftNm: input.allowedLambdaDriftNm,
      conditions: {
        noCrossingsAfter: false,
        nearestReferencePreserved: false,
        lambdaDriftWithinLimit: false,
      },
      limitations,
    };
  }

  let atlasFit: AtlasFitEvidence;
  try {
    atlasFit = await evaluateAtlasFit(
      repository,
      input.targetReference,
      input.correctedTargetCurve,
    );
  } catch {
    return {
      status: "SCISSOR_INVALID",
      targetReference: input.targetReference,
      crossingsBefore: input.crossingsBefore,
      crossingsAfter: input.crossingsAfter,
      nearestAfterCorrection: input.nearestAfterCorrection,
      deltaDeltaLambdaNm: input.deltaDeltaLambdaNm,
      allowedLambdaDriftNm: input.allowedLambdaDriftNm,
      conditions: {
        noCrossingsAfter: false,
        nearestReferencePreserved: false,
        lambdaDriftWithinLimit: false,
      },
      limitations,
    };
  }

  const conditions = {
    noCrossingsAfter: input.crossingsAfter === 0,
    nearestReferencePreserved:
      input.nearestAfterCorrection === input.targetReference &&
      atlasFit.nearestReference === input.targetReference &&
      atlasFit.targetRank === 1,
    lambdaDriftWithinLimit:
      Math.abs(input.deltaDeltaLambdaNm) <= input.allowedLambdaDriftNm,
  } as const;

  return {
    status:
      conditions.noCrossingsAfter &&
      conditions.nearestReferencePreserved &&
      conditions.lambdaDriftWithinLimit
        ? "SCISSOR_LOCKED"
        : "SCISSOR_UNLOCKED",
    targetReference: input.targetReference,
    crossingsBefore: input.crossingsBefore,
    crossingsAfter: input.crossingsAfter,
    nearestAfterCorrection: input.nearestAfterCorrection,
    deltaDeltaLambdaNm: input.deltaDeltaLambdaNm,
    allowedLambdaDriftNm: input.allowedLambdaDriftNm,
    atlasFit,
    conditions,
    limitations,
  };
}
