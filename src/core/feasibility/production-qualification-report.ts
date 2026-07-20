import { createHash } from "node:crypto";
import type { FeasibilityCriterion, FeasibilityEvidence, FeasibilityQualification, FeasibilityStatus } from "./qualification-contract";

export type ProductionRecommendation = "PROCEED_TO_CONTROLLED_TRIAL" | "PROCEED_WITH_CONDITIONS" | "DO_NOT_PROCEED" | "COLLECT_EVIDENCE";

export interface ProductionQualificationReport {
  readonly schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1";
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly qualificationStatus: FeasibilityStatus;
  readonly recommendation: ProductionRecommendation;
  readonly headline: string;
  readonly qualificationStatement: string;
  readonly context: FeasibilityQualification["context"];
  readonly evidenceSummary: { readonly total: number; readonly byType: Readonly<Record<FeasibilityEvidence["evidenceType"], number>>; readonly evidenceIds: readonly string[] };
  readonly criteriaSummary: { readonly total: number; readonly passed: readonly string[]; readonly failed: readonly string[]; readonly unresolved: readonly string[]; readonly optionalNonPassing: readonly string[] };
  readonly blockingCriterionIds: readonly string[];
  readonly unresolvedCriterionIds: readonly string[];
  readonly nextActions: readonly string[];
  readonly qualificationFingerprint: string;
  readonly reportSha256: string;
  readonly claimBoundary: string;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}
function sha256(value: unknown): string { return createHash("sha256").update(canonicalize(value)).digest("hex"); }
function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); } return value; }
function recommendation(status: FeasibilityStatus): ProductionRecommendation { if (status === "FEASIBLE") return "PROCEED_TO_CONTROLLED_TRIAL"; if (status === "CONDITIONAL") return "PROCEED_WITH_CONDITIONS"; if (status === "NOT_FEASIBLE") return "DO_NOT_PROCEED"; return "COLLECT_EVIDENCE"; }
function headline(status: FeasibilityStatus): string { if (status === "FEASIBLE") return "Production qualification supports a controlled trial within the stated process boundary."; if (status === "CONDITIONAL") return "Production qualification remains conditional; resolve the listed criteria before release."; if (status === "NOT_FEASIBLE") return "Production qualification is blocked for the evaluated process context."; return "Production qualification has not been evaluated; collect the required evidence."; }
function summarizeCriteria(criteria: readonly FeasibilityCriterion[]) { return { total: criteria.length, passed: criteria.filter((x) => x.result === "PASS").map((x) => x.criterionId).sort(), failed: criteria.filter((x) => x.result === "FAIL").map((x) => x.criterionId).sort(), unresolved: criteria.filter((x) => x.result === "UNKNOWN").map((x) => x.criterionId).sort(), optionalNonPassing: criteria.filter((x) => !x.required && x.result !== "PASS").map((x) => x.criterionId).sort() }; }
function summarizeEvidence(evidence: readonly FeasibilityEvidence[]) { const byType: Record<FeasibilityEvidence["evidenceType"], number> = { SPECTRAL_REFERENCE: 0, RECIPE_PREDICTION: 0, FASTNESS_PREDICTION: 0, PROCESS_GAMUT: 0, TRIAL_MEASUREMENT: 0, PRODUCTION_MEASUREMENT: 0 }; for (const item of evidence) byType[item.evidenceType] += 1; return { total: evidence.length, byType, evidenceIds: evidence.map((x) => x.evidenceId).sort() }; }
function nextActions(q: FeasibilityQualification): readonly string[] { const actions: string[] = []; if (q.blockingCriterionIds.length) actions.push(`Resolve blocking criteria: ${q.blockingCriterionIds.join(", ")}.`); if (q.unresolvedCriterionIds.length) actions.push(`Collect evidence for unresolved criteria: ${q.unresolvedCriterionIds.join(", ")}.`); if (q.status === "FEASIBLE") actions.push("Run a controlled production trial and verify the result against the stated tolerance and fastness requirements."); if (q.status === "CONDITIONAL" && actions.length === 0) actions.push("Review optional non-passing criteria and document the accepted production conditions."); if (q.status === "NOT_EVALUATED") actions.push("Define qualification criteria and attach traceable spectral, recipe, gamut, fastness, or measurement evidence."); return Object.freeze(actions); }

export function createProductionQualificationReport(qualification: FeasibilityQualification): ProductionQualificationReport {
  const qualificationFingerprint = sha256({ qualificationId: qualification.qualificationId, referenceId: qualification.referenceId, status: qualification.status, context: qualification.context, evidence: qualification.evidence, criteria: qualification.criteria, blockingCriterionIds: qualification.blockingCriterionIds, unresolvedCriterionIds: qualification.unresolvedCriterionIds });
  const payload = { schemaVersion: "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1" as const, qualificationId: qualification.qualificationId, referenceId: qualification.referenceId, qualificationStatus: qualification.status, recommendation: recommendation(qualification.status), headline: headline(qualification.status), qualificationStatement: qualification.statement, context: qualification.context, evidenceSummary: summarizeEvidence(qualification.evidence), criteriaSummary: summarizeCriteria(qualification.criteria), blockingCriterionIds: qualification.blockingCriterionIds, unresolvedCriterionIds: qualification.unresolvedCriterionIds, nextActions: nextActions(qualification), qualificationFingerprint };
  return deepFreeze({ ...payload, reportSha256: sha256(payload), claimBoundary: "This report documents feasibility qualification for the stated material, substrate, colorant system, process route, illuminants, tolerances, and evidence. It does not redefine colour identity, guarantee unrestricted manufacturability, replace production trials, or grant production release." });
}
