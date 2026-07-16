import {
  verifyRuntimeIntelligenceEvidencePackage,
  type RuntimeIntelligenceEvidencePackage,
} from "./runtime-intelligence-evidence-package";

export type RuntimeEvidenceChainVerificationStatus = "VERIFIED" | "REJECTED";

export interface RuntimeEvidenceChainVerificationFinding {
  readonly checkId:
    | "PACKAGE_INTEGRITY"
    | "HLC_IDENTITY"
    | "REPORT_LINKAGE"
    | "STAGE_EVIDENCE_COVERAGE"
    | "CLAIM_BOUNDARY";
  readonly status: "PASS" | "FAIL";
  readonly reason: string;
}

export interface RuntimeEvidenceChainVerificationResult {
  readonly schemaVersion: "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_V1";
  readonly targetReference: string;
  readonly status: RuntimeEvidenceChainVerificationStatus;
  readonly findings: readonly RuntimeEvidenceChainVerificationFinding[];
  readonly verifiedFindingCount: number;
  readonly failedFindingCount: number;
  readonly boundary: string;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

export function verifyRuntimeEvidenceChain(
  packageValue: RuntimeIntelligenceEvidencePackage,
): RuntimeEvidenceChainVerificationResult {
  const payload = packageValue.payload;
  const report = payload.runtimeReport;
  const runtime = report.payload.runtimeResult;
  const completedStages = runtime.stages.filter(
    (stage) => stage.status === "COMPLETED" && stage.stageId !== "RUNTIME_REPORT_BINDING",
  );

  const findings: RuntimeEvidenceChainVerificationFinding[] = [
    {
      checkId: "PACKAGE_INTEGRITY",
      status: verifyRuntimeIntelligenceEvidencePackage(packageValue) ? "PASS" : "FAIL",
      reason: verifyRuntimeIntelligenceEvidencePackage(packageValue)
        ? "Runtime evidence package integrity is valid."
        : "Runtime evidence package integrity or internal consistency failed.",
    },
    {
      checkId: "HLC_IDENTITY",
      status:
        /^H\d{3}_L\d{3}_C\d{3}$/.test(payload.targetReference) &&
        payload.targetReference === report.payload.targetReference &&
        payload.targetReference === runtime.targetReference
          ? "PASS"
          : "FAIL",
      reason: "Package, report and runtime result must share one Hxxx_Lxxx_Cxxx identity.",
    },
    {
      checkId: "REPORT_LINKAGE",
      status:
        payload.runtimeReportSha256 === report.integrity.payloadSha256 &&
        payload.runtimeStatus === report.payload.runtimeStatus
          ? "PASS"
          : "FAIL",
      reason: "Package report hash and runtime status must match the embedded report.",
    },
    {
      checkId: "STAGE_EVIDENCE_COVERAGE",
      status:
        payload.evidenceArtifacts.length === completedStages.length &&
        completedStages.every((stage) =>
          payload.evidenceArtifacts.some(
            (artifact) => artifact.stageId === stage.stageId && artifact.evidenceId === stage.evidenceId,
          ),
        )
          ? "PASS"
          : "FAIL",
      reason: "Every completed evidence-producing stage must have exactly matching evidence.",
    },
    {
      checkId: "CLAIM_BOUNDARY",
      status:
        runtime.prohibitedClaims.includes("RECIPE_APPROVED") &&
        runtime.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED")
          ? "PASS"
          : "FAIL",
      reason: "Mandatory recipe and production-release prohibitions must remain present.",
    },
  ];

  const failedFindingCount = findings.filter((finding) => finding.status === "FAIL").length;
  return freeze({
    schemaVersion: "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_V1",
    targetReference: payload.targetReference,
    status: failedFindingCount === 0 ? "VERIFIED" : "REJECTED",
    findings,
    verifiedFindingCount: findings.length - failedFindingCount,
    failedFindingCount,
    boundary:
      "Verification confirms chain consistency only. It does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
  });
}
