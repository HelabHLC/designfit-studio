import type { FinalMixLockEvidence } from "../mixlock";
import { deriveReportConfidence, type MixLockReportModel } from "./mixlock-report";

export interface MixLockReportRequestContext {
  readonly type: string;
  readonly value: string;
}

export interface MixLockReportAuditContext {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly runtimeVersion: string;
  readonly runtimeCommit: string;
  readonly datasetId: string;
  readonly datasetSha256: string;
}

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must not be empty.`);
}

function metamerismClassification(
  status: FinalMixLockEvidence["status"],
): MixLockReportModel["metamerism"]["classification"] {
  if (status === "REFERENCE_LOCKED_METAMERISM_LOW") return "LOW";
  if (status === "REFERENCE_LOCKED_METAMERISM_WARNING") return "WARNING";
  if (status === "REFERENCE_LOCKED_METAMERISM_RISK") return "RISK";
  return "INVALID";
}

export function buildMixLockReport(
  evidence: FinalMixLockEvidence,
  request: MixLockReportRequestContext,
  audit: MixLockReportAuditContext,
): MixLockReportModel {
  assertNonEmpty(request.type, "Request type");
  assertNonEmpty(request.value, "Request value");
  assertNonEmpty(audit.reportId, "Report ID");
  assertNonEmpty(audit.generatedAt, "Generated timestamp");
  assertNonEmpty(audit.runtimeVersion, "Runtime version");
  assertNonEmpty(audit.runtimeCommit, "Runtime commit");
  assertNonEmpty(audit.datasetId, "Dataset ID");
  assertNonEmpty(audit.datasetSha256, "Dataset SHA-256");

  const structural = evidence.scissor.structuralDrift;
  const correction = evidence.scissor.correction;
  const secondRecipe = evidence.secondRecipe;
  const metamerism = evidence.metamerism;

  if (!structural || !correction || !secondRecipe || !metamerism) {
    throw new Error(
      "Final MixLock evidence is incomplete. Scissor correction, structural drift, second recipe and Metamerism Gate evidence are required.",
    );
  }

  const atlasFit = secondRecipe.atlasFit;
  if (atlasFit.nearestReference === undefined || atlasFit.targetRank === undefined) {
    throw new Error("Final MixLock evidence does not contain a resolved AtlasFit reference and target rank.");
  }

  const reference: MixLockReportModel["reference"] = {
    nearestReference: atlasFit.nearestReference,
    targetRank: atlasFit.targetRank,
    ...(atlasFit.spectralRmse === undefined ? {} : { spectralRmse: atlasFit.spectralRmse }),
    ...(atlasFit.lockMargin === undefined ? {} : { lockMargin: atlasFit.lockMargin }),
  };

  const modelWithoutConfidence: Omit<MixLockReportModel, "confidence"> = {
    reportId: audit.reportId,
    generatedAt: audit.generatedAt,
    targetReference: evidence.targetReference,
    finalStatus: evidence.status,
    finalVerdict: evidence.finalVerdict,
    request: {
      type: request.type,
      value: request.value,
      identityRule: "REQUEST_ONLY",
    },
    reference,
    recipe1: evidence.initialCandidate.recipe.map((item) => ({
      pigmentId: item.pigmentId,
      weight: item.normalizedWeight,
    })),
    scissor: {
      crossingsBefore: correction.crossingsBefore,
      crossingsAfter: correction.crossingsAfter,
      lambdaV2Nm: structural.lambdaV2Nm,
      lambdaEeNm: structural.lambdaEeNm,
      deltaLambdaNm: structural.deltaLambdaNm,
      masterDeltaLambdaNm: structural.masterDeltaLambdaNm,
      deltaDeltaLambdaNm: structural.deltaDeltaLambdaNm,
      driftStatus: structural.driftStatus,
    },
    recipe2: secondRecipe.recipe.map((item) => ({
      pigmentId: item.pigmentId,
      weight: item.normalizedWeight,
    })),
    metamerism: {
      classification: metamerismClassification(evidence.status),
      maximumDeltaE00: metamerism.maximumDeltaE00,
      maximumIlluminant: metamerism.maximumIlluminant,
      evaluations: metamerism.evaluations.map((item) => ({ ...item })),
    },
    audit: {
      runtimeVersion: audit.runtimeVersion,
      runtimeCommit: audit.runtimeCommit,
      datasetId: audit.datasetId,
      datasetSha256: audit.datasetSha256,
      lambdaV2Method: structural.lambdaV2Method,
    },
    limitations: [...evidence.limitations],
  };

  return {
    ...modelWithoutConfidence,
    confidence: deriveReportConfidence(modelWithoutConfidence),
  };
}
