import { evaluateAtlasFit, type CandidateSpectrum } from "../atlasfit";
import type { MasterRepository } from "../master";
import { runSpectralScissorV03, type ScissorV03Options } from "./correct-v03";
import { computeStructuralDrift, type StructuralDriftEvidence } from "./structural-drift";
import { validateSpectralScissor, type ScissorEvidence } from "./validate";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type ScissorLockPipelineStatus =
  | "SCISSOR_LOCKED"
  | "SCISSOR_UNLOCKED"
  | "SCISSOR_INVALID"
  | "TARGET_REFERENCE_NOT_FOUND"
  | "MASTER_STRUCTURAL_DESCRIPTOR_UNAVAILABLE";

export interface ScissorLockPipelineOptions extends ScissorV03Options {
  readonly allowedLambdaDriftNm: number;
}

export interface ScissorLockPipelineEvidence {
  readonly status: ScissorLockPipelineStatus;
  readonly targetReference: string;
  readonly correction?: ReturnType<typeof runSpectralScissorV03>;
  readonly structuralDrift?: StructuralDriftEvidence;
  readonly validation?: ScissorEvidence;
  readonly verdict: "SCISSOR_LOCKED" | "NOT_FINAL";
  readonly limitations: readonly string[];
}

export async function runSpectralScissorLockPipeline(
  repository: MasterRepository,
  targetReference: string,
  candidateSpectrum: CandidateSpectrum,
  options: ScissorLockPipelineOptions,
): Promise<ScissorLockPipelineEvidence> {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  if (!Number.isFinite(options.allowedLambdaDriftNm) || options.allowedLambdaDriftNm < 0) {
    throw new Error("allowedLambdaDriftNm must be finite and non-negative.");
  }

  const target = await repository.findByReference(targetReference);
  const limitations = [
    "The deterministic v0.3 correction operator is used; v0.4 constrained refinement is not included.",
    "Structural drift is computed as candidate delta-lambda minus the Master delta-lambda value.",
    "No second recipe solution has been performed.",
    "No Metamerism Gate has been performed.",
    "Not a production approval.",
  ] as const;

  if (!target) {
    return { status: "TARGET_REFERENCE_NOT_FOUND", targetReference, verdict: "NOT_FINAL", limitations };
  }
  if (target.deltaLambdaNm === undefined) {
    return {
      status: "MASTER_STRUCTURAL_DESCRIPTOR_UNAVAILABLE",
      targetReference,
      verdict: "NOT_FINAL",
      limitations,
    };
  }

  const correction = runSpectralScissorV03(target.spectrum, candidateSpectrum, options);
  if (correction.physicalRangeStatus !== "OK_REFLECTANCE_RANGE") {
    return { status: "SCISSOR_INVALID", targetReference, correction, verdict: "NOT_FINAL", limitations };
  }

  const structuralDrift = computeStructuralDrift(correction.correctedSpectrum, target.deltaLambdaNm);
  const atlasFit = await evaluateAtlasFit(repository, targetReference, correction.correctedSpectrum);

  if (atlasFit.nearestReference === undefined) {
    return {
      status: "SCISSOR_INVALID",
      targetReference,
      correction,
      structuralDrift,
      verdict: "NOT_FINAL",
      limitations,
    };
  }

  const validation = await validateSpectralScissor(repository, {
    targetReference,
    correctedTargetCurve: correction.correctedSpectrum,
    crossingsBefore: correction.crossingsBefore,
    crossingsAfter: correction.crossingsAfter,
    nearestAfterCorrection: atlasFit.nearestReference,
    deltaDeltaLambdaNm: structuralDrift.deltaDeltaLambdaNm,
    allowedLambdaDriftNm: options.allowedLambdaDriftNm,
  });

  return {
    status: validation.status,
    targetReference,
    correction,
    structuralDrift,
    validation,
    verdict: validation.status === "SCISSOR_LOCKED" ? "SCISSOR_LOCKED" : "NOT_FINAL",
    limitations,
  };
}
