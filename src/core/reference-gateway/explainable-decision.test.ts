import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject } from "./decision-object";
import { createReferenceGatewayExplainableDecision } from "./explainable-decision";
import type { ReferenceGatewayResult } from "./types";

const result: ReferenceGatewayResult = {
  status: "REFERENCE_BOUND",
  request: { kind: "HEX", value: "#336699", identityRule: "REQUEST_ONLY" },
  boundReference: "H250_L050_C030",
  candidates: [{ rank: 1, reference: "H250_L050_C030", distance: 1.2, method: "CIE76" }],
  bindingMethod: "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH",
  conversionEvidence: {
    sourceSpace: "SRGB_IEC61966_2_1",
    destinationSpace: "CIELAB_D50",
    lab: { l: 42, a: -2, b: -24 },
    method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD",
  },
  availableActions: ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"],
  claimBoundary: "Request is not an ARBE identity.",
  limitations: ["No production approval."],
};

test("creates a deterministic explanation linked to the decision", () => {
  const decision = createReferenceGatewayDecisionObject(result);
  const left = createReferenceGatewayExplainableDecision(decision);
  const right = createReferenceGatewayExplainableDecision(decision);
  assert.deepEqual(left, right);
  assert.equal(left.decisionSha256, decision.integrity.payloadSha256);
  assert.equal(left.evidenceSha256, decision.evidenceChain.integrity.payloadSha256);
  assert.equal(left.items.length, decision.runtimeTrace.entries.length);
  assert.match(left.conclusion, /H250_L050_C030/);
});

test("preserves trace order and governance boundary", () => {
  const explanation = createReferenceGatewayExplainableDecision(createReferenceGatewayDecisionObject(result));
  assert.deepEqual(explanation.items.map((item) => item.sequence), [1, 2, 3, 4, 5, 6]);
  assert.equal(explanation.items.at(-1)?.stage, "GOVERNANCE");
  assert.equal(explanation.claimBoundary, result.claimBoundary);
});

test("explains unavailable binding without inventing a reference", () => {
  const explanation = createReferenceGatewayExplainableDecision(createReferenceGatewayDecisionObject({
    ...result,
    status: "REQUEST_NORMALIZED_BINDING_UNAVAILABLE",
    boundReference: undefined,
    bindingMethod: undefined,
    candidates: [],
  }));
  assert.match(explanation.conclusion, /did not create or invent/);
});

test("returns deeply frozen explanation objects", () => {
  const explanation = createReferenceGatewayExplainableDecision(createReferenceGatewayDecisionObject(result));
  assert.equal(Object.isFrozen(explanation), true);
  assert.equal(Object.isFrozen(explanation.items), true);
  assert.equal(Object.isFrozen(explanation.items[0]), true);
});
