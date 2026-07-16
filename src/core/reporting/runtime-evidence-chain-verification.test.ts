import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import { createRuntimeIntelligenceEvidencePackage } from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";

function packageValue() {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-hash" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  const report = createRuntimeIntelligenceReportBinding(runtime);
  return createRuntimeIntelligenceEvidencePackage(report, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
}

test("verifies a complete runtime evidence chain", () => {
  const result = verifyRuntimeEvidenceChain(packageValue());
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.verifiedFindingCount, 5);
  assert.equal(result.failedFindingCount, 0);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.findings), true);
});

test("rejects package tampering with diagnostic findings", () => {
  const value = packageValue();
  const tampered = {
    ...value,
    payload: { ...value.payload, runtimeStatus: "STOPPED_BY_REQUIRED_STAGE" as const },
  };
  const result = verifyRuntimeEvidenceChain(tampered);
  assert.equal(result.status, "REJECTED");
  assert.ok(result.failedFindingCount >= 1);
  assert.equal(result.findings.find((finding) => finding.checkId === "PACKAGE_INTEGRITY")?.status, "FAIL");
});

test("keeps verification deterministic", () => {
  const value = packageValue();
  assert.deepEqual(verifyRuntimeEvidenceChain(value), verifyRuntimeEvidenceChain(value));
});
