import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject } from "../reference-gateway";
import type { ReferenceGatewayResult } from "../reference-gateway";
import {
  createReferenceGatewayEvidenceReport,
  verifyReferenceGatewayEvidenceReport,
} from "./reference-gateway-evidence-report";

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

test("creates a deterministic integrity-bound report", () => {
  const decision = createReferenceGatewayDecisionObject(result);
  const left = createReferenceGatewayEvidenceReport(decision);
  const right = createReferenceGatewayEvidenceReport(decision);
  assert.deepEqual(left, right);
  assert.equal(verifyReferenceGatewayEvidenceReport(left), true);
  assert.equal(left.payload.decisionSha256, decision.integrity.payloadSha256);
  assert.equal(left.payload.boundReference, "H250_L050_C030");
});

test("binds explanation and trust assessment to the same source evidence", () => {
  const report = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject(result));
  assert.equal(report.payload.explanation.decisionSha256, report.payload.decisionSha256);
  assert.equal(report.payload.trustAssessment.decisionSha256, report.payload.decisionSha256);
  assert.equal(report.payload.explanation.evidenceSha256, report.payload.evidenceSha256);
  assert.equal(report.payload.trustAssessment.evidenceSha256, report.payload.evidenceSha256);
});

test("detects report tampering", () => {
  const report = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject(result));
  const tampered = {
    ...report,
    payload: { ...report.payload, candidateCount: 99 },
  };
  assert.equal(verifyReferenceGatewayEvidenceReport(tampered), false);
});

test("reports unavailable binding without inventing a reference", () => {
  const report = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject({
    ...result,
    status: "REQUEST_NORMALIZED_BINDING_UNAVAILABLE",
    request: { kind: "DESCRIPTION", value: "quiet blue", identityRule: "REQUEST_ONLY" },
    boundReference: undefined,
    bindingMethod: undefined,
    candidates: [],
    conversionEvidence: undefined,
  }));
  assert.equal(report.payload.boundReference, undefined);
  assert.equal(report.payload.trustAssessment.overallStatus, "EVIDENCE_VERIFIED_NO_REFERENCE_BOUND");
  assert.match(report.payload.explanation.conclusion, /did not create or invent/);
});

test("returns deeply frozen report objects", () => {
  const report = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject(result));
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.explanation), true);
  assert.equal(Object.isFrozen(report.payload.trustAssessment), true);
});
