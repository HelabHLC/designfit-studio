import assert from "node:assert/strict";
import test from "node:test";
import type { ReferenceGatewayResult } from "./types";
import {
  createReferenceGatewayDecisionObject,
  verifyReferenceGatewayDecisionObject,
} from "./decision-object";

const result: ReferenceGatewayResult = {
  status: "REFERENCE_BOUND",
  request: { kind: "HLC_D50", value: { h: 250, l: 50, c: 30 }, identityRule: "REQUEST_ONLY" },
  boundReference: "H250_L050_C030",
  candidates: [{ rank: 1, reference: "H250_L050_C030", distance: 0, method: "CIE76" }],
  bindingMethod: "HLC_D50_TO_LAB_D50_CIE76_MASTER_SEARCH",
  conversionEvidence: {
    sourceSpace: "HLC_AB_D50_DEGREES",
    destinationSpace: "CIELAB_D50",
    lab: { l: 50, a: -10.260604299770062, b: -28.19077862357725 },
    method: "HLC_AB_D50_DEGREES_TO_LAB_D50",
  },
  availableActions: ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"],
  claimBoundary: "Request is not an ARBE identity.",
  limitations: ["No production approval."],
};

test("creates a deterministic integrity-bound decision object", () => {
  const left = createReferenceGatewayDecisionObject(result);
  const right = createReferenceGatewayDecisionObject(result);
  assert.deepEqual(left, right);
  assert.equal(left.payload.schemaVersion, "ARBE_REFERENCE_GATEWAY_DECISION_V1");
  assert.equal(left.payload.evidenceSha256, left.evidenceChain.integrity.payloadSha256);
  assert.equal(left.runtimeTrace.sourceEvidenceSha256, left.evidenceChain.integrity.payloadSha256);
  assert.equal(left.payload.boundReference, "H250_L050_C030");
  assert.equal(verifyReferenceGatewayDecisionObject(left), true);
});

test("detects tampering with decision payload", () => {
  const decision = createReferenceGatewayDecisionObject(result);
  const tampered = structuredClone(decision);
  (tampered.payload as { boundReference?: string }).boundReference = "H000_L000_C000";
  assert.equal(verifyReferenceGatewayDecisionObject(tampered), false);
});

test("detects broken evidence and trace linkage", () => {
  const decision = createReferenceGatewayDecisionObject(result);
  const tampered = structuredClone(decision);
  (tampered.runtimeTrace as { sourceEvidenceSha256: string }).sourceEvidenceSha256 = "0".repeat(64);
  assert.equal(verifyReferenceGatewayDecisionObject(tampered), false);
});

test("returns deeply frozen decision objects", () => {
  const decision = createReferenceGatewayDecisionObject(result);
  assert.equal(Object.isFrozen(decision), true);
  assert.equal(Object.isFrozen(decision.payload), true);
  assert.equal(Object.isFrozen(decision.gatewayResult), true);
  assert.equal(Object.isFrozen(decision.evidenceChain), true);
  assert.equal(Object.isFrozen(decision.runtimeTrace), true);
});
