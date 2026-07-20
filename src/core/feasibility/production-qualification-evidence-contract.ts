import type { FeasibilityCriterion, FeasibilityContext, FeasibilityEvidence, FeasibilityStatus } from "./qualification-contract";
import type { ProductionQualificationReport } from "./production-qualification-report";

export type ProductionQualificationArtifactKind =
  | "QUALIFICATION_SNAPSHOT"
  | "PRODUCTION_QUALIFICATION_REPORT"
  | "EVIDENCE_RECORD"
  | "CRITERION_RECORD";

export interface ProductionQualificationEvidenceArtifact {
  readonly artifactId: string;
  readonly kind: ProductionQualificationArtifactKind;
  readonly sha256: string;
}

export interface ProductionQualificationSnapshot {
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly status: FeasibilityStatus;
  readonly context: FeasibilityContext;
  readonly evidence: readonly FeasibilityEvidence[];
  readonly criteria: readonly FeasibilityCriterion[];
  readonly blockingCriterionIds: readonly string[];
  readonly unresolvedCriterionIds: readonly string[];
  readonly statement: string;
}

export interface ProductionQualificationEvidencePackagePayload {
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly qualificationStatus: FeasibilityStatus;
  readonly qualificationFingerprint: string;
  readonly reportSha256: string;
  readonly qualification: ProductionQualificationSnapshot;
  readonly report: ProductionQualificationReport;
  readonly artifacts: readonly ProductionQualificationEvidenceArtifact[];
  readonly claimBoundary: string;
}

export interface ProductionQualificationEvidencePackage {
  readonly schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_PACKAGE_V1";
  readonly payload: ProductionQualificationEvidencePackagePayload;
  readonly packageSha256: string;
}

export type ProductionQualificationVerificationCheckId =
  | "SCHEMA"
  | "PACKAGE_INTEGRITY"
  | "REPORT_INTEGRITY"
  | "QUALIFICATION_LINKAGE"
  | "ARTIFACT_MANIFEST"
  | "CRITERION_EVIDENCE_REFERENCES"
  | "CLAIM_BOUNDARY";

export interface ProductionQualificationVerificationFinding {
  readonly checkId: ProductionQualificationVerificationCheckId;
  readonly status: "PASS" | "FAIL";
  readonly reason: string;
}

export interface ProductionQualificationEvidenceVerification {
  readonly schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_EVIDENCE_VERIFICATION_V1";
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly status: "VERIFIED" | "REJECTED";
  readonly findings: readonly ProductionQualificationVerificationFinding[];
  readonly verifiedFindingCount: number;
  readonly failedFindingCount: number;
  readonly boundary: string;
}
