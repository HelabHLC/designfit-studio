import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject, type ReferenceGatewayResult } from "../reference-gateway";
import { createSpectralIntelligenceSummary } from "../spectral-intelligence";
import { createReferenceGatewayEvidenceReport } from "./reference-gateway-evidence-report";
import {
  createSpectralIntelligenceReportBinding,
  verifySpectralIntelligenceReportBinding,
} from "./spectral-intelligence-report-binding";

const gatewayResult: ReferenceGatewayResult = {
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

function createGatewayReport() {
  return createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject(gatewayResult));
}

test("creates a deterministic integrity-bound spectral report binding", () => {
  const gatewayReport = createGatewayReport();
  const summary = createSpectralIntelligenceSummary({ targetReference: "H250_L050_C030" });
  const left = createSpectralIntelligenceReportBinding(gatewayReport, summary);
  const right = createSpectralIntelligenceReportBinding(gatewayReport, summary);
  assert.deepEqual(left, right);
  assert.equal(verifySpectralIntelligenceReportBinding(left), true);
  assert.equal(left.payload.gatewayReportSha256, gatewayReport.integrity.payloadSha256);
  assert.equal(left.payload.spectralOverallStatus, "SPECTRAL_EVIDENCE_INCOMPLETE");
});

test("rejects spectral evidence for a different ARBE reference", () => {
  const summary = createSpectralIntelligenceSummary({ targetReference: "H120_L060_C040" });
  assert.throws(
    () => createSpectralIntelligenceReportBinding(createGatewayReport(), summary),
    /target mismatch/,
  );
});

test("requires a bound reference before spectral report binding", () => {
  const unavailable = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject({
    ...gatewayResult,
    status: "REQUEST_NORMALIZED_BINDING_UNAVAILABLE",
    boundReference: undefined,
    bindingMethod: undefined,
    candidates: [],
  }));
  const summary = createSpectralIntelligenceSummary({ targetReference: "H250_L050_C030" });
  assert.throws(
    () => createSpectralIntelligenceReportBinding(unavailable, summary),
    /requires a bound ARBE reference/,
  );
});

test("detects report payload tampering", () => {
  const report = createSpectralIntelligenceReportBinding(
    createGatewayReport(),
    createSpectralIntelligenceSummary({ targetReference: "H250_L050_C030" }),
  );
  const tampered = {
    ...report,
    payload: { ...report.payload, completedSpectralDomains: 4 },
  };
  assert.equal(verifySpectralIntelligenceReportBinding(tampered), false);
});

test("returns deeply frozen spectral report objects", () => {
  const report = createSpectralIntelligenceReportBinding(
    createGatewayReport(),
    createSpectralIntelligenceSummary({ targetReference: "H250_L050_C030" }),
  );
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.spectralSummary), true);
});
