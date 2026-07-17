import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import { createRuntimeIntelligenceEvidencePackage } from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";
import { createRuntimeEvidenceChainVerificationReport } from "./runtime-evidence-chain-verification-report";
import { createRuntimeVerificationAuditPackage } from "./runtime-verification-audit-package";
import { createRuntimeIntelligenceAuditManifest, verifyRuntimeIntelligenceAuditManifest } from "./runtime-intelligence-audit-manifest";

function source() {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-hash" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  const report = createRuntimeIntelligenceReportBinding(runtime);
  const evidence = createRuntimeIntelligenceEvidencePackage(report, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
  const verification = createRuntimeEvidenceChainVerificationReport(verifyRuntimeEvidenceChain(evidence));
  return createRuntimeVerificationAuditPackage(evidence, verification);
}

test("creates a deterministic verifiable runtime audit manifest", () => {
  const audit = source();
  const left = createRuntimeIntelligenceAuditManifest(audit);
  const right = createRuntimeIntelligenceAuditManifest(audit);
  assert.deepEqual(left, right);
  assert.equal(left.payload.verificationStatus, "VERIFIED");
  assert.equal(left.payload.sourceHashes.length, 3);
  assert.equal(verifyRuntimeIntelligenceAuditManifest(left), true);
  assert.equal(Object.isFrozen(left.payload.auditPackage), true);
});

test("detects manifest tampering", () => {
  const value = createRuntimeIntelligenceAuditManifest(source());
  const tampered = { ...value, payload: { ...value.payload, verificationStatus: "REJECTED" as const } };
  assert.equal(verifyRuntimeIntelligenceAuditManifest(tampered), false);
});
