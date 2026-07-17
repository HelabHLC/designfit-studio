import assert from "node:assert/strict";
import test from "node:test";
import { assessIndustrialValidation } from "../industrial-validation";
import { COMPLETE_INDUSTRIAL_VALIDATION_INPUT } from "../industrial-validation/fixtures";
import { createIndustrialDecisionContract } from "./industrial-decision-contract";

const validation = assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT);
const sha = "d".repeat(64);

test("creates a reference-bound decision contract", () => {
  const contract = createIndustrialDecisionContract({
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_INPUT_V1",
    targetReference: validation.targetReference,
    validation,
    findings: [
      { module: "SPECTRAL_INTELLIGENCE", status: "CAUTION", evidenceSha256: "e".repeat(64), summary: "Structural caution recorded.", limitations: ["Cause remains unconfirmed."] },
      { module: "ATLASFIT", status: "SUPPORTS_REVIEW", evidenceSha256: sha, summary: "Reference evidence available.", limitations: ["No equivalence claim."] },
    ],
  });
  assert.equal(contract.readiness, "READY_FOR_DECISION_SYNTHESIS");
  assert.deepEqual(contract.findings.map((item) => item.module), ["ATLASFIT", "SPECTRAL_INTELLIGENCE"]);
  assert.deepEqual(contract.cautionModules, ["SPECTRAL_INTELLIGENCE"]);
  assert.ok(Object.isFrozen(contract));
  assert.ok(contract.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"));
});

test("blocking evidence prevents synthesis readiness", () => {
  const contract = createIndustrialDecisionContract({
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_INPUT_V1",
    targetReference: validation.targetReference,
    validation,
    findings: [{ module: "MIXLOCK", status: "BLOCKS_REVIEW", evidenceSha256: sha, summary: "Recipe evidence incomplete.", limitations: ["No approval."] }],
  });
  assert.equal(contract.readiness, "REQUIRES_ADDITIONAL_EVIDENCE");
  assert.deepEqual(contract.blockingModules, ["MIXLOCK"]);
});

test("rejects duplicate findings", () => {
  const finding = { module: "ATLASFIT" as const, status: "SUPPORTS_REVIEW" as const, evidenceSha256: sha, summary: "Evidence available.", limitations: ["No equivalence claim."] };
  assert.throws(() => createIndustrialDecisionContract({ schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_INPUT_V1", targetReference: validation.targetReference, validation, findings: [finding, finding] }), /Duplicate/);
});
