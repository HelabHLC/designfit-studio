import { createHash } from "node:crypto";

import type { FeasibilityQualification } from "./qualification-contract";
import type {
  ProductionQualificationEvidenceArtifact,
  ProductionQualificationEvidencePackage,
  ProductionQualificationSnapshot,
} from "./production-qualification-evidence-contract";
import { createProductionQualificationReport } from "./production-qualification-report";

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function snapshot(qualification: FeasibilityQualification): ProductionQualificationSnapshot {
  return {
    qualificationId: qualification.qualificationId,
    referenceId: qualification.referenceId,
    status: qualification.status,
    context: qualification.context,
    evidence: [...qualification.evidence].sort((a, b) => a.evidenceId.localeCompare(b.evidenceId)),
    criteria: [...qualification.criteria].sort((a, b) => a.criterionId.localeCompare(b.criterionId)),
    blockingCriterionIds: [...qualification.blockingCriterionIds].sort(),
    unresolvedCriterionIds: [...qualification.unresolvedCriterionIds].sort(),
    statement: qualification.statement,
  };
}

function artifacts(
  qualification: ProductionQualificationSnapshot,
  reportSha256: string,
): readonly ProductionQualificationEvidenceArtifact[] {
  return [
    { artifactId: "qualification", kind: "QUALIFICATION_SNAPSHOT" as const, sha256: sha256(qualification) },
    { artifactId: "report", kind: "PRODUCTION_QUALIFICATION_REPORT" as const, sha256: reportSha256 },
    ...qualification.evidence.map((item) => ({
      artifactId: `evidence:${item.evidenceId}`,
      kind: "EVIDENCE_RECORD" as const,
      sha256: sha256(item),
    })),
    ...qualification.criteria.map((item) => ({
      artifactId: `criterion:${item.criterionId}`,
      kind: "CRITERION_RECORD" as const,
      sha256: sha256(item),
    })),
  ].sort((a, b) => a.artifactId.localeCompare(b.artifactId));
}

export function createProductionQualificationEvidencePackage(
  qualificationInput: FeasibilityQualification,
): ProductionQualificationEvidencePackage {
  const qualification = snapshot(qualificationInput);
  const report = createProductionQualificationReport(qualificationInput);
  const payload = {
    qualificationId: qualification.qualificationId,
    referenceId: qualification.referenceId,
    qualificationStatus: qualification.status,
    qualificationFingerprint: report.qualificationFingerprint,
    reportSha256: report.reportSha256,
    qualification,
    report,
    artifacts: artifacts(qualification, report.reportSha256),
    claimBoundary:
      "This package preserves qualification evidence and deterministic linkage. It does not certify production output, approve a recipe, replace a controlled trial, or grant production release.",
  };

  return deepFreeze({
    schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_PACKAGE_V1",
    payload,
    packageSha256: sha256(payload),
  });
}
