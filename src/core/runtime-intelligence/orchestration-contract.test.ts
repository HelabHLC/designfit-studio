import assert from "node:assert/strict";
import test from "node:test";
import {
  createRuntimeIntelligenceOrchestrationContract,
  validateRuntimeIntelligenceOrchestrationContract,
} from "./orchestration-contract";

test("creates deterministic valid orchestration contract", () => {
  const left = createRuntimeIntelligenceOrchestrationContract();
  const right = createRuntimeIntelligenceOrchestrationContract();
  assert.deepEqual(left, right);
  assert.equal(validateRuntimeIntelligenceOrchestrationContract(left), true);
  assert.deepEqual(left.stages.map((stage) => stage.stageId), [
    "REFERENCE_GATEWAY",
    "SPECTRAL_INTELLIGENCE",
    "RECIPE_INTELLIGENCE",
    "RUNTIME_REPORT_BINDING",
  ]);
});

test("requires evidence when recipe intelligence is skipped", () => {
  const contract = createRuntimeIntelligenceOrchestrationContract();
  const recipeStage = contract.stages[2];
  assert.equal(recipeStage.requirement, "CONDITIONAL");
  assert.equal(recipeStage.failureMode, "SKIP_WITH_EVIDENCE");
});

test("rejects changed stage order and lost claim boundaries", () => {
  const contract = createRuntimeIntelligenceOrchestrationContract();
  const reordered = { ...contract, stages: [contract.stages[1], contract.stages[0], ...contract.stages.slice(2)] };
  assert.equal(validateRuntimeIntelligenceOrchestrationContract(reordered), false);
  const weakened = { ...contract, prohibitedClaims: contract.prohibitedClaims.filter((claim) => claim !== "PRODUCTION_RELEASE_GRANTED") };
  assert.equal(validateRuntimeIntelligenceOrchestrationContract(weakened), false);
});

test("returns deeply frozen contract objects", () => {
  const contract = createRuntimeIntelligenceOrchestrationContract();
  assert.equal(Object.isFrozen(contract), true);
  assert.equal(Object.isFrozen(contract.stages), true);
  assert.equal(Object.isFrozen(contract.stages[0]), true);
  assert.equal(Object.isFrozen(contract.limitations), true);
});
