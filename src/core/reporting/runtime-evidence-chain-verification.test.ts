import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import { createRuntimeIntelligenceEvidencePackage } from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";
import { createRuntimeEvidenceChainVerificationReport, verifyRuntimeEvidenceChainVerificationReport } from "./runtime-evidence-chain-verification-report";

function packageValue() {
  const runtime = orchestrateRuntimeIntelligence({ targetReference: "H250_L050_C030", referenceGateway: { status: "VALID", evidenceId: "gateway-hash" }, spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" }, recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." } });
  return createRuntimeIntelligenceEvidencePackage(createRuntimeIntelligenceReportBinding(runtime), [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
}

test("verifies a complete runtime evidence chain", () => {
  const result = verifyRuntimeEvidenceChain(packageValue());
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.verifiedFindingCount, 5);
  assert.equal(result.failedFindingCount, 0);
  assert.equal(Object.isFrozen(result.findings), true);
});

test("rejects package tampering with diagnostic findings", () => {
  const value = packageValue();
  const result = verifyRuntimeEvidenceChain({ ...value, payload: { ...value.payload, runtimeStatus: "STOPPED_BY_REQUIRED_STAGE" as const } });
  assert.equal(result.status, "REJECTED");
  assert.equal(result.findings.find((finding) => finding.checkId === "PACKAGE_INTEGRITY")?.status, "FAIL");
});

test("keeps verification deterministic", () => {
  const value = packageValue();
  assert.deepEqual(verifyRuntimeEvidenceChain(value), verifyRuntimeEvidenceChain(value));
});

test("binds verified and rejected results without status promotion", () => {
  const verified = verifyRuntimeEvidenceChain(packageValue());
  const verifiedReport = createRuntimeEvidenceChainVerificationReport(verified);
  assert.equal(verifyRuntimeEvidenceChainVerificationReport(verifiedReport), true);
  const rejected = { ...verified, status: "REJECTED" as const, findings: verified.findings.map((finding, index) => index === 0 ? { ...finding, status: "FAIL" as const } : finding), verifiedFindingCount: 4, failedFindingCount: 1 };
  const rejectedReport = createRuntimeEvidenceChainVerificationReport(rejected);
  assert.equal(rejectedReport.payload.verificationStatus, "REJECTED");
  assert.equal(verifyRuntimeEvidenceChainVerificationReport(rejectedReport), true);
  assert.equal(verifyRuntimeEvidenceChainVerificationReport({ ...rejectedReport, payload: { ...rejectedReport.payload, failedFindingCount: 9 } }), false);
});
