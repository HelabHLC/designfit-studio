import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeIntelligenceContract } from "./recipe-intelligence-contract";

const reference = "H250_L050_C030";

test("creates a deterministic Recipe Intelligence Contract v1", () => {
  const left = createRecipeIntelligenceContract(reference);
  const right = createRecipeIntelligenceContract(reference);

  assert.deepEqual(left, right);
  assert.equal(left.schemaVersion, "ARBE_RECIPE_INTELLIGENCE_CONTRACT_V1");
  assert.equal(left.targetReference, reference);
  assert.equal(left.requirements.length, 7);
  assert.equal(left.requirements.filter((item) => item.mandatoryForReviewableCandidate).length, 6);
});

test("preserves HLC identity and explicit prohibited claims", () => {
  const contract = createRecipeIntelligenceContract(reference);
  assert.equal(contract.identityRule, "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY");
  assert.ok(contract.prohibitedClaims.includes("RECIPE_APPROVED"));
  assert.ok(contract.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"));
  assert.match(contract.claimBoundary, /does not prove a global optimum/);
});

test("rejects request values and malformed references", () => {
  assert.throws(() => createRecipeIntelligenceContract("#336699"), /Hxxx_Lxxx_Cxxx/);
  assert.throws(() => createRecipeIntelligenceContract("L50_C30_H250"), /Hxxx_Lxxx_Cxxx/);
});

test("returns deeply frozen contract objects", () => {
  const contract = createRecipeIntelligenceContract(reference);
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.requirements), true);
  assert.equal(Object.isFrozen(contract.requirements[0]), true);
  assert.equal(Object.isFrozen(contract.allowedOutcomeStatuses), true);
  assert.equal(Object.isFrozen(contract.prohibitedClaims), true);
  assert.equal(Object.isFrozen(contract.limitations), true);
});
