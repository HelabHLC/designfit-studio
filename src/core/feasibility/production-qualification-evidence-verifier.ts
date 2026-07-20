import { createHash } from "node:crypto";

import type {
  ProductionQualificationEvidenceArtifact,
  ProductionQualificationEvidencePackage,
  ProductionQualificationEvidenceVerification,
  ProductionQualificationVerificationFinding,
} from "./production-qualification-evidence-contract";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasPackageShape(value: unknown): value is ProductionQualificationEvidencePackage {
  if (!isRecord(value) || value.schemaVersion !== "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_PACKAGE_V1") return false;
  if (typeof value.packageSha256 !== "string" || !isRecord(value.payload)) return false;
  const payload = value.payload;
  return typeof payload.qualificationId === "string" &&
    typeof payload.referenceId === "string" &&
    typeof payload.qualificationFingerprint === "string" &&
    typeof payload.reportSha256 === "string" &&
    isRecord(payload.qualification) &&
    isRecord(payload.report) &&
    Array.isArray(payload.artifacts);
}

function expectedArtifacts(packageValue: ProductionQualificationEvidencePackage): readonly ProductionQualificationEvidenceArtifact[] {
  const qualification = packageValue.payload.qualification;
  return [
    { artifactId: "qualification", kind: "QUALIFICATION_SNAPSHOT", sha256: sha256(qualification) },
    { artifactId: "report", kind: "PRODUCTION_QUALIFICATION_REPORT", sha256: packageValue.payload.report.reportSha256 },
    ...qualification.evidence.map((item) => ({ artifactId: `evidence:${item.evidenceId}`, kind: "EVIDENCE_RECORD" as const, sha256: sha256(item) })),
    ...qualification.criteria.map((item) => ({ artifactId: `criterion:${item.criterionId}`, kind: "CRITERION_RECORD" as const, sha256: sha256(item) })),
  ].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}

function finding(checkId: ProductionQualificationVerificationFinding["checkId"], pass: boolean, reason: string): ProductionQualificationVerificationFinding {
  return { checkId, status: pass ? "PASS" : "FAIL", reason };
}

export function verifyProductionQualificationEvidencePackage(value: unknown): ProductionQualificationEvidenceVerification {
  const schemaPass = hasPackageShape(value);
  if (!schemaPass) {
    const findings = [finding("SCHEMA", false, "The value does not satisfy the WP14.1 evidence-package envelope.")];
    return freeze({
      schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_VERIFICATION_V1",
      qualificationId: "UNKNOWN",
      referenceId: "UNKNOWN",
      status: "REJECTED",
      findings,
      verifiedFindingCount: 0,
      failedFindingCount: 1,
      boundary: "Verification checks deterministic integrity and linkage only; it does not certify production output or grant release.",
    });
  }

  const payload = value.payload;
  const qualification = payload.qualification;
  const report = payload.report;
  const reportPayload = { ...report } as Record<string, unknown>;
  delete reportPayload.reportSha256;
  delete reportPayload.claimBoundary;

  const evidenceIds = new Set(qualification.evidence.map((item) => item.evidenceId));
  const criterionReferencesPass = qualification.criteria.every((criterion) =>
    criterion.evidenceIds.every((evidenceId) => evidenceIds.has(evidenceId)),
  );
  const expected = expectedArtifacts(value);

  const findings: ProductionQualificationVerificationFinding[] = [
    finding("SCHEMA", true, "The WP14.1 evidence-package envelope is structurally present."),
    finding("PACKAGE_INTEGRITY", value.packageSha256 === sha256(payload), "Package SHA-256 must match the canonical payload."),
    finding(
      "REPORT_INTEGRITY",
      report.reportSha256 === sha256(reportPayload) && payload.reportSha256 === report.reportSha256,
      "The embedded WP13 report hash and package report linkage must both be valid.",
    ),
    finding(
      "QUALIFICATION_LINKAGE",
      payload.qualificationId === qualification.qualificationId &&
        payload.referenceId === qualification.referenceId &&
        payload.qualificationStatus === qualification.status &&
        payload.qualificationFingerprint === report.qualificationFingerprint &&
        report.qualificationId === qualification.qualificationId &&
        report.referenceId === qualification.referenceId &&
        report.qualificationStatus === qualification.status,
      "Package, qualification snapshot and report must identify the same qualification, reference and status.",
    ),
    finding("ARTIFACT_MANIFEST", canonicalize(payload.artifacts) === canonicalize(expected), "The artifact manifest must exactly cover and hash the snapshot, report, evidence and criteria."),
    finding("CRITERION_EVIDENCE_REFERENCES", criterionReferencesPass, "Every criterion evidence reference must resolve to an evidence record in the package."),
    finding(
      "CLAIM_BOUNDARY",
      payload.claimBoundary.includes("does not certify production output") &&
        payload.claimBoundary.includes("grant production release") &&
        report.claimBoundary.includes("does not redefine colour identity"),
      "Mandatory qualification and production-release claim boundaries must remain present.",
    ),
  ];

  const failedFindingCount = findings.filter((item) => item.status === "FAIL").length;
  return freeze({
    schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_VERIFICATION_V1",
    qualificationId: payload.qualificationId,
    referenceId: payload.referenceId,
    status: failedFindingCount === 0 ? "VERIFIED" : "REJECTED",
    findings,
    verifiedFindingCount: findings.length - failedFindingCount,
    failedFindingCount,
    boundary: "Verification checks deterministic integrity and linkage only; it does not certify production output or grant release.",
  });
}
