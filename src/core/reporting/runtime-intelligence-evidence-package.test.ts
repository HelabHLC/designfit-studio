import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createRuntimeIntelligenceReportBinding } from "./runtime-intelligence-report-binding";
import {
  createRuntimeIntelligenceEvidencePackage,
  verifyRuntimeIntelligenceEvidencePackage,
} from "./runtime-intelligence-evidence-package";

function report(recipe = true) {
  return createRuntimeIntelligenceReportBinding(orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-hash" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-hash" },
    recipeIntelligence: recipe
      ? { requested: true, evidence: { status: "VALID", evidenceId: "recipe-hash" } }
      : { requested: false, skipReason: "No recipe candidates supplied." },
  }));
}

test("creates deterministic package with exact completed-stage evidence", () => {
  const runtimeReport = report();
  const artifacts = [
    { stageId: "RECIPE_INTELLIGENCE" as const, evidenceId: "recipe-hash" },
    { stageId: "REFERENCE_GATEWAY" as const, evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE" as const, evidenceId: "spectral-hash" },
  ];
  const left = createRuntimeIntelligenceEvidencePackage(runtimeReport, artifacts);
  const right = createRuntimeIntelligenceEvidencePackage(runtimeReport, [...artifacts].reverse());
  assert.deepEqual(left, right);
  assert.equal(verifyRuntimeIntelligenceEvidencePackage(left), true);
  assert.deepEqual(left.payload.evidenceArtifacts.map((item) => item.stageId), [
    "REFERENCE_GATEWAY", "SPECTRAL_INTELLIGENCE", "RECIPE_INTELLIGENCE",
  ]);
});

test("accepts explicit recipe skip without inventing a recipe artifact", () => {
  const runtimeReport = report(false);
  const value = createRuntimeIntelligenceEvidencePackage(runtimeReport, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
  ]);
  assert.equal(value.payload.evidenceArtifacts.length, 2);
  assert.equal(verifyRuntimeIntelligenceEvidencePackage(value), true);
});

test("rejects missing, duplicate and foreign evidence artifacts", () => {
  const runtimeReport = report();
  const base = [
    { stageId: "REFERENCE_GATEWAY" as const, evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE" as const, evidenceId: "spectral-hash" },
    { stageId: "RECIPE_INTELLIGENCE" as const, evidenceId: "recipe-hash" },
  ];
  assert.throws(() => createRuntimeIntelligenceEvidencePackage(runtimeReport, base.slice(0, 2)), /exact completed-stage/);
  assert.throws(() => createRuntimeIntelligenceEvidencePackage(runtimeReport, [base[0], base[0], base[2]]), /unique/);
  assert.throws(() => createRuntimeIntelligenceEvidencePackage(runtimeReport, [base[0], base[1], { ...base[2], evidenceId: "foreign" }]), /Missing runtime evidence/);
});

test("detects tampering and freezes nested package data", () => {
  const runtimeReport = report();
  const value = createRuntimeIntelligenceEvidencePackage(runtimeReport, [
    { stageId: "REFERENCE_GATEWAY", evidenceId: "gateway-hash" },
    { stageId: "SPECTRAL_INTELLIGENCE", evidenceId: "spectral-hash" },
    { stageId: "RECIPE_INTELLIGENCE", evidenceId: "recipe-hash" },
  ]);
  const tampered = { ...value, payload: { ...value.payload, runtimeStatus: "STOPPED_BY_REQUIRED_STAGE" as const } };
  assert.equal(verifyRuntimeIntelligenceEvidencePackage(tampered), false);
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.payload.evidenceArtifacts), true);
  assert.equal(Object.isFrozen(value.payload.evidenceArtifacts[0]), true);
});
