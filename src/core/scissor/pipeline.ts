import { evaluateAtlasFit, type AtlasFitEvidence, type CandidateSpectrum } from "../atlasfit";
import type { MasterRepository } from "../master";
import { runSpectralScissorV03, type ScissorV03Options, type ScissorV03Result } from "./correct-v03";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type ScissorPipelineStatus =
  | "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR"
  | "TARGET_REFERENCE_NOT_FOUND"
  | "SCISSOR_CANDIDATE_OUT_OF_RANGE";

export interface ScissorPipelineEvidence {
  readonly status: ScissorPipelineStatus;
  readonly targetReference: string;
  readonly correction?: ScissorV03Result;
  readonly atlasFit?: AtlasFitEvidence;
  readonly automaticallyDerived?: {
    readonly crossingsBefore: number;
    readonly crossingsAfter: number;
    readonly nearestAfterCorrection?: string;
  };
  readonly descriptorGate: "PENDING_LAMBDA_V2_EVALUATION";
  readonly verdict: "NOT_FINAL";
  readonly limitations: readonly string[];
}

export async function runSpectralScissorPipeline(
  repository: MasterRepository,
  targetReference: string,
  candidateSpectrum: CandidateSpectrum,
  options: ScissorV03Options = {},
): Promise<ScissorPipelineEvidence> {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }

  const target = await repository.findByReference(targetReference);
  const limitations = [
    "The deterministic v0.3 correction operator is used; v0.4 constrained refinement is not included.",
    "Lambda_V2 and delta-delta-lambda have not yet been calculated.",
    "SCISSOR_LOCKED cannot be issued until the descriptor drift gate is evaluated.",
    "No second recipe solution or Metamerism Gate has been performed.",
    "Not a production approval.",
  ] as const;

  if (!target) {
    return {
      status: "TARGET_REFERENCE_NOT_FOUND",
      targetReference,
      descriptorGate: "PENDING_LAMBDA_V2_EVALUATION",
      verdict: "NOT_FINAL",
      limitations,
    };
  }

  const correction = runSpectralScissorV03(
    {
      wavelengthsNm: target.spectrum.wavelengthsNm,
      reflectance: target.spectrum.reflectance,
    },
    candidateSpectrum,
    options,
  );

  if (correction.physicalRangeStatus !== "OK_REFLECTANCE_RANGE") {
    return {
      status: "SCISSOR_CANDIDATE_OUT_OF_RANGE",
      targetReference,
      correction,
      automaticallyDerived: {
        crossingsBefore: correction.crossingsBefore,
        crossingsAfter: correction.crossingsAfter,
      },
      descriptorGate: "PENDING_LAMBDA_V2_EVALUATION",
      verdict: "NOT_FINAL",
      limitations,
    };
  }

  const atlasFit = await evaluateAtlasFit(repository, targetReference, correction.correctedSpectrum);

  return {
    status: "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR",
    targetReference,
    correction,
    atlasFit,
    automaticallyDerived: {
      crossingsBefore: correction.crossingsBefore,
      crossingsAfter: correction.crossingsAfter,
      nearestAfterCorrection: atlasFit.nearestReference,
    },
    descriptorGate: "PENDING_LAMBDA_V2_EVALUATION",
    verdict: "NOT_FINAL",
    limitations,
  };
}
