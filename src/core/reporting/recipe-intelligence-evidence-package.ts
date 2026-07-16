import { createHash, timingSafeEqual } from "node:crypto";
import {
  verifyRecipeDecisionSupportReportBinding,
  type RecipeDecisionSupportReportBinding,
} from "./recipe-decision-support-report-binding";
import {
  verifyRecipeEvidenceAssessmentReportBinding,
  type RecipeEvidenceAssessmentReportBinding,
} from "./recipe-evidence-assessment-report-binding";

export interface RecipeCandidateAssessmentBinding {
  readonly candidateId: string;
  readonly assessmentReport: RecipeEvidenceAssessmentReportBinding;
}

export interface RecipeIntelligenceEvidencePackage {
  readonly payload: {
    readonly schemaVersion: "ARBE_RECIPE_INTELLIGENCE_EVIDENCE_PACKAGE_V1";
    readonly targetReference: string;
    readonly candidateCount: number;
    readonly decisionSupportReportSha256: string;
    readonly decisionSupportReport: RecipeDecisionSupportReportBinding;
    readonly candidateAssessments: readonly RecipeCandidateAssessmentBinding[];
    readonly boundary: string;
    readonly limitations: readonly string[];
  };
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Recipe package JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported recipe package value type: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validateSources(
  decisionReport: RecipeDecisionSupportReportBinding,
  assessments: readonly RecipeCandidateAssessmentBinding[],
): void {
  if (!verifyRecipeDecisionSupportReportBinding(decisionReport)) {
    throw new Error("Recipe Decision Support report integrity failed.");
  }
  const target = decisionReport.payload.targetReference;
  const expectedIds = decisionReport.payload.decisionSupport.items.map((item) => item.candidateId);
  if (assessments.length !== expectedIds.length) {
    throw new Error("Recipe package requires exactly one assessment report per decision-support candidate.");
  }
  const supplied = new Map<string, RecipeEvidenceAssessmentReportBinding>();
  for (const item of assessments) {
    const id = item.candidateId.trim();
    if (!id) throw new Error("Recipe package candidateId must be non-empty.");
    if (supplied.has(id)) throw new Error(`Duplicate recipe package candidateId: ${id}.`);
    if (!verifyRecipeEvidenceAssessmentReportBinding(item.assessmentReport)) {
      throw new Error(`Recipe assessment report integrity failed for ${id}.`);
    }
    if (item.assessmentReport.payload.targetReference !== target) {
      throw new Error(`Recipe assessment target mismatch for ${id}.`);
    }
    supplied.set(id, item.assessmentReport);
  }
  for (const id of expectedIds) {
    if (!supplied.has(id)) throw new Error(`Missing recipe assessment report for ${id}.`);
  }
}

export function computeRecipeIntelligenceEvidencePackageSha256(
  payload: RecipeIntelligenceEvidencePackage["payload"],
): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRecipeIntelligenceEvidencePackage(
  decisionSupportReport: RecipeDecisionSupportReportBinding,
  candidateAssessments: readonly RecipeCandidateAssessmentBinding[],
): RecipeIntelligenceEvidencePackage {
  validateSources(decisionSupportReport, candidateAssessments);
  const order = new Map(
    decisionSupportReport.payload.decisionSupport.items.map((item, index) => [item.candidateId, index]),
  );
  const orderedAssessments = [...candidateAssessments]
    .map((item) => ({ candidateId: item.candidateId.trim(), assessmentReport: item.assessmentReport }))
    .sort((left, right) => order.get(left.candidateId)! - order.get(right.candidateId)!);
  const payload: RecipeIntelligenceEvidencePackage["payload"] = {
    schemaVersion: "ARBE_RECIPE_INTELLIGENCE_EVIDENCE_PACKAGE_V1",
    targetReference: decisionSupportReport.payload.targetReference,
    candidateCount: orderedAssessments.length,
    decisionSupportReportSha256: decisionSupportReport.integrity.payloadSha256,
    decisionSupportReport,
    candidateAssessments: orderedAssessments,
    boundary: "This package records recipe evidence and bounded review guidance. It does not identify a best recipe, approve a formulation, certify equivalence or grant production release.",
    limitations: [
      "Package integrity proves internal consistency, not the scientific validity of upstream measurements.",
      "Candidate IDs and formulation components remain candidate-space data and are not ARBE identities.",
      "Only the bound Hxxx_Lxxx_Cxxx record is an ARBE identity.",
    ],
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeRecipeIntelligenceEvidencePackageSha256(payload),
    },
  });
}

export function verifyRecipeIntelligenceEvidencePackage(
  packageValue: RecipeIntelligenceEvidencePackage,
): boolean {
  const payload = packageValue.payload;
  if (
    payload.schemaVersion !== "ARBE_RECIPE_INTELLIGENCE_EVIDENCE_PACKAGE_V1" ||
    packageValue.integrity.algorithm !== "SHA-256" ||
    packageValue.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(packageValue.integrity.payloadSha256) ||
    payload.candidateCount !== payload.candidateAssessments.length ||
    payload.decisionSupportReportSha256 !== payload.decisionSupportReport.integrity.payloadSha256 ||
    payload.targetReference !== payload.decisionSupportReport.payload.targetReference
  ) return false;
  try { validateSources(payload.decisionSupportReport, payload.candidateAssessments); } catch { return false; }
  const expected = Buffer.from(computeRecipeIntelligenceEvidencePackageSha256(payload), "hex");
  const supplied = Buffer.from(packageValue.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
