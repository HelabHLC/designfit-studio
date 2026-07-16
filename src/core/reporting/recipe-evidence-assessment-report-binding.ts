import { createHash, timingSafeEqual } from "node:crypto";
import type { RecipeEvidenceAssessment } from "../mixlock";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export interface RecipeEvidenceAssessmentReportBindingPayload {
  readonly schemaVersion: "ARBE_RECIPE_EVIDENCE_ASSESSMENT_REPORT_BINDING_V1";
  readonly reportType: "REFERENCE_BOUND_RECIPE_EVIDENCE_ASSESSMENT";
  readonly targetReference: string;
  readonly outcomeStatus: RecipeEvidenceAssessment["outcomeStatus"];
  readonly completedMandatoryRequirements: number;
  readonly requiredMandatoryRequirements: 6;
  readonly materialAndProcessContext: RecipeEvidenceAssessment["materialAndProcessContext"];
  readonly findingCount: number;
  readonly nextAction: string;
  readonly assessment: RecipeEvidenceAssessment;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface RecipeEvidenceAssessmentReportBinding {
  readonly payload: RecipeEvidenceAssessmentReportBindingPayload;
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical recipe assessment report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical recipe assessment report value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function assertAssessment(assessment: RecipeEvidenceAssessment): void {
  if (!REFERENCE_PATTERN.test(assessment.targetReference)) {
    throw new Error("Recipe assessment target reference must match Hxxx_Lxxx_Cxxx.");
  }
  if (assessment.schemaVersion !== "ARBE_RECIPE_EVIDENCE_ASSESSMENT_V1") {
    throw new Error("Unsupported Recipe Evidence Assessment schema.");
  }
  if (assessment.requiredMandatoryRequirements !== 6) {
    throw new Error("Recipe assessment must retain six mandatory requirements.");
  }
  if (
    !Number.isInteger(assessment.completedMandatoryRequirements) ||
    assessment.completedMandatoryRequirements < 0 ||
    assessment.completedMandatoryRequirements > assessment.requiredMandatoryRequirements
  ) {
    throw new Error("Recipe assessment mandatory requirement count is invalid.");
  }
  if (assessment.findings.length !== 7) {
    throw new Error("Recipe assessment must contain exactly seven contract findings.");
  }
  if (!assessment.nextAction.trim()) throw new Error("Recipe assessment requires a next action.");
  if (assessment.prohibitedClaims.includes("RECIPE_APPROVED") === false) {
    throw new Error("Recipe assessment must retain the RECIPE_APPROVED prohibition.");
  }
  if (assessment.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED") === false) {
    throw new Error("Recipe assessment must retain the PRODUCTION_RELEASE_GRANTED prohibition.");
  }
}

export function computeRecipeEvidenceAssessmentReportBindingSha256(
  payload: RecipeEvidenceAssessmentReportBindingPayload,
): string {
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

export function createRecipeEvidenceAssessmentReportBinding(
  assessment: RecipeEvidenceAssessment,
): RecipeEvidenceAssessmentReportBinding {
  assertAssessment(assessment);

  const payload: RecipeEvidenceAssessmentReportBindingPayload = {
    schemaVersion: "ARBE_RECIPE_EVIDENCE_ASSESSMENT_REPORT_BINDING_V1",
    reportType: "REFERENCE_BOUND_RECIPE_EVIDENCE_ASSESSMENT",
    targetReference: assessment.targetReference,
    outcomeStatus: assessment.outcomeStatus,
    completedMandatoryRequirements: assessment.completedMandatoryRequirements,
    requiredMandatoryRequirements: assessment.requiredMandatoryRequirements,
    materialAndProcessContext: assessment.materialAndProcessContext,
    findingCount: assessment.findings.length,
    nextAction: assessment.nextAction,
    assessment,
    claimBoundary: "This report records a deterministic recipe-evidence assessment. It does not recompute source evidence, approve a recipe, certify equivalence or grant production release.",
    limitations: [
      ...assessment.limitations,
      "Report integrity proves payload consistency, not the scientific validity of upstream evidence.",
      "A reviewable analytical candidate remains unapproved candidate-space evidence.",
    ],
  };

  return deepFreeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeRecipeEvidenceAssessmentReportBindingSha256(payload),
    },
  });
}

export function verifyRecipeEvidenceAssessmentReportBinding(
  report: RecipeEvidenceAssessmentReportBinding,
): boolean {
  const payload = report.payload;
  if (
    payload.schemaVersion !== "ARBE_RECIPE_EVIDENCE_ASSESSMENT_REPORT_BINDING_V1" ||
    payload.reportType !== "REFERENCE_BOUND_RECIPE_EVIDENCE_ASSESSMENT" ||
    report.integrity.algorithm !== "SHA-256" ||
    report.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(report.integrity.payloadSha256) ||
    payload.targetReference !== payload.assessment.targetReference ||
    payload.outcomeStatus !== payload.assessment.outcomeStatus ||
    payload.completedMandatoryRequirements !== payload.assessment.completedMandatoryRequirements ||
    payload.requiredMandatoryRequirements !== payload.assessment.requiredMandatoryRequirements ||
    payload.materialAndProcessContext !== payload.assessment.materialAndProcessContext ||
    payload.findingCount !== payload.assessment.findings.length ||
    payload.nextAction !== payload.assessment.nextAction ||
    !payload.assessment.prohibitedClaims.includes("RECIPE_APPROVED") ||
    !payload.assessment.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED")
  ) return false;

  try {
    assertAssessment(payload.assessment);
  } catch {
    return false;
  }

  const expected = Buffer.from(computeRecipeEvidenceAssessmentReportBindingSha256(payload), "hex");
  const supplied = Buffer.from(report.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
