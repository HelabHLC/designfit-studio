import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import { createRuntimeIntelligenceEvidencePackage } from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";
import { createRuntimeEvidenceChainVerificationReport } from "./runtime-evidence-chain-verification-report";
import {
  createRuntimeVerificationAuditPackage,
  verifyRuntimeVerificationAuditPackage,
} from "./runtime-verification-audit-package";

function source(targetReference = "H250_L050_C030") {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference,
    referenceGateway: { status: "VALID", evidenceId: "gateway-hash" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  const runtimeReport = createRuntimeIntelligenceReportBinding(runtime);
  const runtimePackage = createRuntimeIntelligenceEvidencePackage(runtimeReport, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
  const verificationReport = createRuntimeEvidenceChainVerificationReport(verifyRuntimeEvidenceChain(runtimePackage));
  return { runtimePackage, verificationReport };
}

test("creates and verifies a deterministic runtime audit package", () => {
  const { runtimePackage, verificationReport } = source();
  const left = createRuntimeVerificationAuditPackage(runtimePackage, verificationReport);
  const right = createRuntimeVerificationAuditPackage(runtimePackage, verificationReport);
  assert.deepEqual(left, right);
  assert.equal(left.payload.verificationStatus, "VERIFIED");
  assert.equal(verifyRuntimeVerificationAuditPackage(left), true);
});

test("rejects a verification report belonging to another runtime package", () => {
  const left = source("H250_L050_C030");
  const right = source("H120_L060_C040");
  assert.throws(
    () => createRuntimeVerificationAuditPackage(left.runtimePackage, right.verificationReport),
    /references do not match/,
  );
});

test("detects audit-package tampering", () => {
  const { runtimePackage, verificationReport } = source();
  const value = createRuntimeVerificationAuditPackage(runtimePackage, verificationReport);
  const tampered = {
    ...value,
    payload: { ...value.payload, verificationStatus: "REJECTED" as const },
  };
  assert.equal(verifyRuntimeVerificationAuditPackage(tampered), false);
});

test("deeply freezes nested audit data", () => {
  const { runtimePackage, verificationReport } = source();
  const value = createRuntimeVerificationAuditPackage(runtimePackage, verificationReport);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.payload), true);
  assert.equal(Object.isFrozen(value.payload.runtimeEvidencePackage), true);
  assert.equal(Object.isFrozen(value.payload.verificationReport), true);
});
