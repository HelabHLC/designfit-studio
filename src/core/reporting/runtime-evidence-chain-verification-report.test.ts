import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import { createRuntimeIntelligenceEvidencePackage } from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";
import {
  createRuntimeEvidenceChainVerificationReport,
  verifyRuntimeEvidenceChainVerificationReport,
} from "./runtime-evidence-chain-verification-report";

function verification() {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-hash" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  const runtimeReport = createRuntimeIntelligenceReportBinding(runtime);
  const packageValue = createRuntimeIntelligenceEvidencePackage(runtimeReport, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
  return verifyRuntimeEvidenceChain(packageValue);
}

test("creates deterministic and verifiable verification report", () => {
  const result = verification();
  const left = createRuntimeEvidenceChainVerificationReport(result);
  const right = createRuntimeEvidenceChainVerificationReport(result);
  assert.deepEqual(left, right);
  assert.equal(left.payload.verificationStatus, "VERIFIED");
  assert.equal(verifyRuntimeEvidenceChainVerificationReport(left), true);
});

test("preserves rejected verification results without promotion", () => {
  const valid = verification();
  const rejected = {
    ...valid,
    status: "REJECTED" as const,
    findings: valid.findings.map((finding, index) => index === 0 ? { ...finding, status: "FAIL" as const } : finding),
    verifiedFindingCount: 4,
    failedFindingCount: 1,
  };
  const report = createRuntimeEvidenceChainVerificationReport(rejected);
  assert.equal(report.payload.verificationStatus, "REJECTED");
  assert.equal(verifyRuntimeEvidenceChainVerificationReport(report), true);
});

test("detects tampering and freezes nested report data", () => {
  const report = createRuntimeEvidenceChainVerificationReport(verification());
  const tampered = { ...report, payload: { ...report.payload, failedFindingCount: 9 } };
  assert.equal(verifyRuntimeEvidenceChainVerificationReport(tampered), false);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.verificationResult), true);
});
