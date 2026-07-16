import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRecipeEvidence,
  type RecipeEvidenceItem,
  type RecipeEvidenceStatus,
  type RecipeIntelligenceRequirementId,
} from "../mixlock";
import {
  createRecipeEvidenceAssessmentReportBinding,
  verifyRecipeEvidenceAssessmentReportBinding,
} from "./recipe-evidence-assessment-report-binding";

const reference = "H250_L050_C030";
const ids: readonly RecipeIntelligenceRequirementId[] = [
  "ATLAS_REFERENCE_BOUND",
  "CANDIDATE_RECIPE_AVAILABLE",
  "CANDIDATE_SPECTRUM_AVAILABLE",
  "ATLAS_FIT_EVIDENCE_AVAILABLE",
  "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED",
  "METAMERISM_EVIDENCE_AVAILABLE",
  "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED",
];

function evidence(overrides: Partial<Record<RecipeIntelligenceRequirementId, RecipeEvidenceStatus>> = {}): RecipeEvidenceItem[] {
  return ids.map((requirementId) => ({
    requirementId,
    status: overrides[requirementId] ?? "PRESENT",
    evidence: `${requirementId} evidence supplied.`,
  }));
}

function assessment(overrides: Partial<Record<RecipeIntelligenceRequirementId, RecipeEvidenceStatus>> = {}) {
  return assessRecipeEvidence(reference, evidence(overrides));
}

test("creates a deterministic integrity-bound recipe assessment report", () => {
  const left = createRecipeEvidenceAssessmentReportBinding(assessment());
  const right = createRecipeEvidenceAssessmentReportBinding(assessment());
  assert.deepEqual(left, right);
  assert.equal(verifyRecipeEvidenceAssessmentReportBinding(left), true);
  assert.equal(left.payload.targetReference, reference);
  assert.equal(left.payload.outcomeStatus, "RECIPE_CANDIDATE_REVIEWABLE");
  assert.equal(left.payload.findingCount, 7);
});

test("preserves technical-review and blocking outcomes without approval claims", () => {
  const review = createRecipeEvidenceAssessmentReportBinding(
    assessment({ METAMERISM_EVIDENCE_AVAILABLE: "WATCH" }),
  );
  const blocked = createRecipeEvidenceAssessmentReportBinding(
    assessment({ ATLAS_FIT_EVIDENCE_AVAILABLE: "BLOCK" }),
  );
  assert.equal(review.payload.outcomeStatus, "RECIPE_TECHNICAL_REVIEW_REQUIRED");
  assert.equal(blocked.payload.outcomeStatus, "RECIPE_BLOCKED_BY_EVIDENCE");
  assert.ok(review.payload.assessment.prohibitedClaims.includes("RECIPE_APPROVED"));
  assert.ok(blocked.payload.assessment.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"));
});

test("detects report payload tampering", () => {
  const report = createRecipeEvidenceAssessmentReportBinding(assessment());
  const tampered = {
    ...report,
    payload: { ...report.payload, findingCount: 99 },
  };
  assert.equal(verifyRecipeEvidenceAssessmentReportBinding(tampered), false);
});

test("rejects malformed assessment inputs", () => {
  const valid = assessment();
  assert.throws(
    () => createRecipeEvidenceAssessmentReportBinding({ ...valid, targetReference: "#336699" }),
    /Hxxx_Lxxx_Cxxx/,
  );
  assert.throws(
    () => createRecipeEvidenceAssessmentReportBinding({ ...valid, findings: valid.findings.slice(0, 6) }),
    /exactly seven/,
  );
});

test("returns deeply frozen report objects", () => {
  const report = createRecipeEvidenceAssessmentReportBinding(assessment());
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.assessment), true);
  assert.equal(Object.isFrozen(report.payload.assessment.findings), true);
  assert.equal(Object.isFrozen(report.integrity), true);
});
