import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRecipeEvidence,
  type RecipeEvidenceItem,
  type RecipeEvidenceStatus,
} from "./recipe-evidence-assessment";
import type { RecipeIntelligenceRequirementId } from "./recipe-intelligence-contract";

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

test("classifies a complete candidate as analytically reviewable", () => {
  const left = assessRecipeEvidence(reference, evidence());
  const right = assessRecipeEvidence(reference, evidence());
  assert.deepEqual(left, right);
  assert.equal(left.outcomeStatus, "RECIPE_CANDIDATE_REVIEWABLE");
  assert.equal(left.completedMandatoryRequirements, 6);
  assert.equal(left.materialAndProcessContext, "DOCUMENTED");
});

test("distinguishes missing, review and blocking evidence", () => {
  assert.equal(
    assessRecipeEvidence(reference, evidence({ CANDIDATE_SPECTRUM_AVAILABLE: "MISSING" })).outcomeStatus,
    "RECIPE_EVIDENCE_INCOMPLETE",
  );
  assert.equal(
    assessRecipeEvidence(reference, evidence({ METAMERISM_EVIDENCE_AVAILABLE: "WATCH" })).outcomeStatus,
    "RECIPE_TECHNICAL_REVIEW_REQUIRED",
  );
  assert.equal(
    assessRecipeEvidence(reference, evidence({ ATLAS_FIT_EVIDENCE_AVAILABLE: "BLOCK" })).outcomeStatus,
    "RECIPE_BLOCKED_BY_EVIDENCE",
  );
});

test("allows analytical review without claiming production qualification", () => {
  const result = assessRecipeEvidence(reference, evidence({ MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED: "MISSING" }));
  assert.equal(result.outcomeStatus, "RECIPE_CANDIDATE_REVIEWABLE");
  assert.equal(result.materialAndProcessContext, "NOT_DOCUMENTED");
  assert.match(result.nextAction, /before physical qualification/);
  assert.ok(result.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"));
});

test("requires one explicit evidence item per contract requirement", () => {
  assert.throws(() => assessRecipeEvidence(reference, evidence().slice(0, 6)), /explicit item/);
  assert.throws(() => assessRecipeEvidence(reference, [...evidence(), evidence()[0]]), /Duplicate/);
  assert.throws(() => assessRecipeEvidence("#336699", evidence()), /Hxxx_Lxxx_Cxxx/);
});

test("returns deeply frozen assessment objects", () => {
  const result = assessRecipeEvidence(reference, evidence());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.findings), true);
  assert.equal(Object.isFrozen(result.findings[0]), true);
  assert.equal(Object.isFrozen(result.prohibitedClaims), true);
  assert.equal(Object.isFrozen(result.limitations), true);
});
