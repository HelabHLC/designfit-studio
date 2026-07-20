import { createHash } from "node:crypto";

import type { FeasibilityCriterion, FeasibilityEvidence, FeasibilityQualification } from "./qualification-contract";

export type QualificationReportDecision = "APPROVED_FOR_DEFINED_CONTEXT" | "CONDITIONAL_REVIEW" | "REJECTED_FOR_DEFINED_CONTEXT" | "EVIDENCE_REQUIRED";
export type EvidenceCompleteness = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";

export interface ProductionQualificationReport {
  readonly schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1";
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly decision: QualificationReportDecision;
  readonly headline: string;
  readonly context: FeasibilityQualification["context"];
  readonly evidenceSummary: {
    readonly completeness: EvidenceCompleteness;
    readonly totalEvidence: number;
    readonly evidenceTypes: readonly FeasibilityEvidence["evidenceType"][];
    readonly unreferencedEvidenceIds: readonly string[];
  };
  readonly criterionSummary: {
    readonly total: number;
    readonly passed: readonly string[];
    readonly failed: readonly string[];
    readonly unresolved: readonly string[];
    readonly blocking: readonly string[];
  };
  readonly sections: {
    readonly reference: string;
    readonly recipePrediction: string;
    readonly processGamut: string;
    readonly fastness: string;
    readonly metamerism: string;
    readonly measurements: string;
  };
  readonly nextAction: string;
  readonly qualificationStatement: string;
  readonly reportSha256: string;
  readonly claimBoundary: string;
}

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

function decision(qualification: FeasibilityQualification): QualificationReportDecision {
  if (qualification.status === "FEASIBLE") return "APPROVED_FOR_DEFINED_CONTEXT";
  if (qualification.status === "NOT_FEASIBLE") return "REJECTED_FOR_DEFINED_CONTEXT";
  if (qualification.status === "CONDITIONAL") return "CONDITIONAL_REVIEW";
  return "EVIDENCE_REQUIRED";
}

function completeness(qualification: FeasibilityQualification): EvidenceCompleteness {
  if (qualification.criteria.length === 0 || qualification.evidence.length === 0) return "INSUFFICIENT";
  if (qualification.unresolvedCriterionIds.length > 0) return "PARTIAL";
  return "COMPLETE";
}

function evidenceSection(evidence: readonly FeasibilityEvidence[], type: FeasibilityEvidence["evidenceType"], empty: string): string {
  const matching = evidence.filter((item) => item.evidenceType === type);
  if (matching.length === 0) return empty;
  return matching.map((item) => `${item.evidenceId}: ${item.source}${item.note ? ` — ${item.note}` : ""}`).join(" | ");
}

function criterionIds(criteria: readonly FeasibilityCriterion[], result: FeasibilityCriterion["result"]): readonly string[] {
  return Object.freeze(criteria.filter((item) => item.result === result).map((item) => item.criterionId));
}

export function createProductionQualificationReport(qualification: FeasibilityQualification): ProductionQualificationReport {
  const referencedEvidence = new Set(qualification.criteria.flatMap((criterion) => criterion.evidenceIds));
  const unreferencedEvidenceIds = qualification.evidence.map((item) => item.evidenceId).filter((id) => !referencedEvidence.has(id));
  const evidenceTypes = [...new Set(qualification.evidence.map((item) => item.evidenceType))].sort();
  const reportDecision = decision(qualification);

  const payload = {
    schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1" as const,
    qualificationId: qualification.qualificationId,
    referenceId: qualification.referenceId,
    decision: reportDecision,
    headline:
      reportDecision === "APPROVED_FOR_DEFINED_CONTEXT" ? "Qualified for the defined production context." :
      reportDecision === "REJECTED_FOR_DEFINED_CONTEXT" ? "Not qualified for the defined production context." :
      reportDecision === "CONDITIONAL_REVIEW" ? "Conditional qualification requires review." :
      "Production qualification requires evidence.",
    context: qualification.context,
    evidenceSummary: {
      completeness: completeness(qualification),
      totalEvidence: qualification.evidence.length,
      evidenceTypes: Object.freeze(evidenceTypes),
      unreferencedEvidenceIds: Object.freeze(unreferencedEvidenceIds),
    },
    criterionSummary: {
      total: qualification.criteria.length,
      passed: criterionIds(qualification.criteria, "PASS"),
      failed: criterionIds(qualification.criteria, "FAIL"),
      unresolved: criterionIds(qualification.criteria, "UNKNOWN"),
      blocking: qualification.blockingCriterionIds,
    },
    sections: {
      reference: evidenceSection(qualification.evidence, "SPECTRAL_REFERENCE", "No spectral reference evidence supplied."),
      recipePrediction: evidenceSection(qualification.evidence, "RECIPE_PREDICTION", "No recipe prediction evidence supplied."),
      processGamut: evidenceSection(qualification.evidence, "PROCESS_GAMUT", "No process gamut evidence supplied."),
      fastness: evidenceSection(qualification.evidence, "FASTNESS_PREDICTION", "No fastness prediction evidence supplied."),
      metamerism: `Illuminants evaluated: ${qualification.context.illuminants.join(", ") || "none specified"}.`,
      measurements: [
        evidenceSection(qualification.evidence, "TRIAL_MEASUREMENT", "No trial measurement evidence supplied."),
        evidenceSection(qualification.evidence, "PRODUCTION_MEASUREMENT", "No production measurement evidence supplied."),
      ].join(" "),
    },
    nextAction:
      reportDecision === "APPROVED_FOR_DEFINED_CONTEXT" ? "Proceed through the applicable production release and approval process." :
      reportDecision === "REJECTED_FOR_DEFINED_CONTEXT" ? `Resolve blocking criteria: ${qualification.blockingCriterionIds.join(", ") || "not specified"}.` :
      reportDecision === "CONDITIONAL_REVIEW" ? `Resolve or accept outstanding criteria: ${qualification.unresolvedCriterionIds.join(", ") || "optional findings"}.` :
      "Add governed spectral, prediction, gamut, fastness, and measurement evidence, then rerun qualification.",
    qualificationStatement: qualification.statement,
  };

  return freeze({
    ...payload,
    reportSha256: sha256(payload),
    claimBoundary:
      "This report qualifies a colour reference only for the explicitly stated material, substrate, colorant system, process route, illuminants, tolerances, and evidence. It does not establish universal manufacturability or authorize production release.",
  });
}
