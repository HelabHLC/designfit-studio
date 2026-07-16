import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject, type ReferenceGatewayResult } from "../reference-gateway";
import type { StructuralCauseIndicatorsResult } from "../spectral-intelligence";
import { createReferenceGatewayEvidenceReport } from "./reference-gateway-evidence-report";
import {
  createStructuralCauseIndicatorReportBinding,
  verifyStructuralCauseIndicatorReportBinding,
} from "./structural-cause-indicator-report-binding";

const reference = "H250_L050_C030";
const gatewayResult: ReferenceGatewayResult = {
  status: "REFERENCE_BOUND",
  request: { kind: "HEX", value: "#336699", identityRule: "REQUEST_ONLY" },
  boundReference: reference,
  candidates: [{ rank: 1, reference, distance: 1.2, method: "CIE76" }],
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

function gatewayReport() {
  return createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject(gatewayResult));
}

function causeResult(targetReference = reference): StructuralCauseIndicatorsResult {
  return {
    schemaVersion: "ARBE_STRUCTURAL_CAUSE_INDICATORS_V1",
    targetReference,
    method: "DETERMINISTIC_EVIDENCE_TO_INVESTIGATION_INDICATORS_V1",
    assessmentStatus: "STRUCTURAL_WATCH",
    status: "INDICATORS_RECORDED",
    indicators: [{
      sequence: 1,
      code: "LOCALIZED_REFLECTANCE_DEPRESSION",
      sourceDomain: "WINDOW_STRUCTURE",
      sourceStatus: "WATCH",
      dominantWindowId: "W560_610",
      direction: "CANDIDATE_BELOW",
      evidence: "Localized window evidence.",
      interpretation: "The principal difference is localized.",
    }],
    investigationCandidates: [{
      sequence: 1,
      domain: "PIGMENT_OR_FORMULATION",
      triggeredBy: ["LOCALIZED_REFLECTANCE_DEPRESSION"],
      action: "Compare controlled formulation evidence.",
      boundary: "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE",
    }],
    claimBoundary: "Indicators are not root-cause findings.",
    limitations: ["No production release."],
  };
}

test("creates a deterministic integrity-bound cause-indicator report binding", () => {
  const left = createStructuralCauseIndicatorReportBinding(gatewayReport(), causeResult());
  const right = createStructuralCauseIndicatorReportBinding(gatewayReport(), causeResult());
  assert.deepEqual(left, right);
  assert.equal(verifyStructuralCauseIndicatorReportBinding(left), true);
  assert.equal(left.payload.indicatorCount, 1);
  assert.equal(left.payload.investigationCandidateCount, 1);
});

test("rejects a different target reference", () => {
  assert.throws(
    () => createStructuralCauseIndicatorReportBinding(gatewayReport(), causeResult("H120_L060_C040")),
    /target mismatch/,
  );
});

test("detects tampering and preserves the investigation boundary", () => {
  const report = createStructuralCauseIndicatorReportBinding(gatewayReport(), causeResult());
  const tampered = { ...report, payload: { ...report.payload, indicatorCount: 9 } };
  assert.equal(verifyStructuralCauseIndicatorReportBinding(tampered), false);
  assert.equal(
    report.payload.causeIndicators.investigationCandidates[0].boundary,
    "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE",
  );
});

test("returns deeply frozen report objects", () => {
  const report = createStructuralCauseIndicatorReportBinding(gatewayReport(), causeResult());
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.causeIndicators), true);
  assert.equal(Object.isFrozen(report.integrity), true);
});
