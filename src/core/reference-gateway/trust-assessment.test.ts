import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject } from "./decision-object";
import { createReferenceGatewayTrustAssessment } from "./trust-assessment";
import type { ReferenceGatewayResult } from "./types";

const boundResult: ReferenceGatewayResult = {
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

test("creates deterministic rule-based findings for a bound request", () => {
  const decision = createReferenceGatewayDecisionObject(boundResult);
  const left = createReferenceGatewayTrustAssessment(decision);
  const right = createReferenceGatewayTrustAssessment(decision);
  assert.deepEqual(left, right);
  assert.equal(left.overallStatus, "EVIDENCE_VERIFIED_REFERENCE_BOUND");
  assert.equal(left.decisionSha256, decision.integrity.payloadSha256);
  assert.deepEqual(left.findings.map((finding) => finding.status), [
    "VERIFIED",
    "RECORDED",
    "RECORDED",
    "VERIFIED",
    "NOT_PERFORMED",
    "NOT_GRANTED",
  ]);
});

test("does not turn unavailable binding into a trust score or invented reference", () => {
  const assessment = createReferenceGatewayTrustAssessment(createReferenceGatewayDecisionObject({
    ...boundResult,
    status: "REQUEST_NORMALIZED_BINDING_UNAVAILABLE",
    boundReference: undefined,
    bindingMethod: undefined,
    candidates: [],
    conversionEvidence: undefined,
    request: { kind: "DESCRIPTION", value: "quiet blue", identityRule: "REQUEST_ONLY" },
  }));
  assert.equal(assessment.overallStatus, "EVIDENCE_VERIFIED_NO_REFERENCE_BOUND");
  assert.equal(assessment.findings[2]?.status, "NOT_AVAILABLE");
  assert.equal(assessment.findings[3]?.status, "NOT_AVAILABLE");
  assert.equal("score" in assessment, false);
});

test("marks transformation as not required for direct reference lookup", () => {
  const assessment = createReferenceGatewayTrustAssessment(createReferenceGatewayDecisionObject({
    ...boundResult,
    request: { kind: "REFERENCE", value: "H250_L050_C030", identityRule: "REQUEST_ONLY" },
    bindingMethod: "DIRECT_REFERENCE",
    conversionEvidence: undefined,
    candidates: [{ rank: 1, reference: "H250_L050_C030", method: "DIRECT_REFERENCE" }],
  }));
  assert.equal(assessment.findings[2]?.status, "NOT_REQUIRED");
});

test("returns deeply frozen assessment objects", () => {
  const assessment = createReferenceGatewayTrustAssessment(createReferenceGatewayDecisionObject(boundResult));
  assert.equal(Object.isFrozen(assessment), true);
  assert.equal(Object.isFrozen(assessment.findings), true);
  assert.equal(Object.isFrozen(assessment.findings[0]), true);
});

test("rejects a tampered Decision Object", () => {
  const decision = createReferenceGatewayDecisionObject(boundResult);
  const tampered = {
    ...decision,
    payload: { ...decision.payload, candidateCount: 99 },
  };
  assert.throws(
    () => createReferenceGatewayTrustAssessment(tampered),
    /integrity verification failed/,
  );
});
