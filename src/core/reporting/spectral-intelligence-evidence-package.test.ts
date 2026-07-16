import assert from "node:assert/strict";
import test from "node:test";
import { createReferenceGatewayDecisionObject, type ReferenceGatewayResult } from "../reference-gateway";
import { createSpectralIntelligenceSummary, type StructuralCauseIndicatorsResult } from "../spectral-intelligence";
import { createReferenceGatewayEvidenceReport } from "./reference-gateway-evidence-report";
import { createSpectralIntelligenceReportBinding } from "./spectral-intelligence-report-binding";
import { createStructuralCauseIndicatorReportBinding } from "./structural-cause-indicator-report-binding";
import {
  createSpectralIntelligenceEvidencePackage,
  verifySpectralIntelligenceEvidencePackage,
} from "./spectral-intelligence-evidence-package";

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

function reports() {
  const gateway = gatewayReport();
  return {
    spectral: createSpectralIntelligenceReportBinding(
      gateway,
      createSpectralIntelligenceSummary({ targetReference: reference }),
    ),
    cause: createStructuralCauseIndicatorReportBinding(gateway, causeResult()),
  };
}

test("creates a deterministic integrity-bound evidence package", () => {
  const { spectral, cause } = reports();
  const left = createSpectralIntelligenceEvidencePackage(spectral, cause);
  const right = createSpectralIntelligenceEvidencePackage(spectral, cause);
  assert.deepEqual(left, right);
  assert.equal(verifySpectralIntelligenceEvidencePackage(left), true);
  assert.equal(left.payload.targetReference, reference);
  assert.equal(left.payload.causeIndicatorReport.payload.investigationCandidateCount, 1);
});

test("rejects reports from different Gateway evidence chains", () => {
  const { spectral } = reports();
  const alteredGateway = createReferenceGatewayEvidenceReport(createReferenceGatewayDecisionObject({
    ...gatewayResult,
    request: { kind: "HEX", value: "#336698", identityRule: "REQUEST_ONLY" },
  }));
  const cause = createStructuralCauseIndicatorReportBinding(alteredGateway, causeResult());
  assert.throws(
    () => createSpectralIntelligenceEvidencePackage(spectral, cause),
    /same verified Gateway evidence chain/,
  );
});

test("detects package tampering", () => {
  const { spectral, cause } = reports();
  const evidencePackage = createSpectralIntelligenceEvidencePackage(spectral, cause);
  const tampered = {
    ...evidencePackage,
    payload: { ...evidencePackage.payload, targetReference: "H120_L060_C040" },
  };
  assert.equal(verifySpectralIntelligenceEvidencePackage(tampered), false);
});

test("returns deeply frozen package objects", () => {
  const { spectral, cause } = reports();
  const evidencePackage = createSpectralIntelligenceEvidencePackage(spectral, cause);
  assert.equal(Object.isFrozen(evidencePackage), true);
  assert.equal(Object.isFrozen(evidencePackage.payload), true);
  assert.equal(Object.isFrozen(evidencePackage.payload.spectralReport), true);
  assert.equal(Object.isFrozen(evidencePackage.payload.causeIndicatorReport), true);
  assert.equal(Object.isFrozen(evidencePackage.integrity), true);
});
