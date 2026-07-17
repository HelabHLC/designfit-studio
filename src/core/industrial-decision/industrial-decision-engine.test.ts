import assert from "node:assert/strict";
import test from "node:test";

import type { IndustrialDecisionContract, IndustrialModuleFindingStatus } from "./industrial-decision-contract";
import { runIndustrialDecisionEngine } from "./industrial-decision-engine";

const sha = "a".repeat(64);

function contractWith(statuses: readonly IndustrialModuleFindingStatus[]): IndustrialDecisionContract {
  const findings = statuses.map((status, index) => ({
    module: (["ATLASFIT", "SPECTRAL_INTELLIGENCE", "MIXLOCK", "SPECTRAL_SCISSOR"] as const)[index],
    status,
    evidenceSha256: sha,
    summary: `${status} finding`,
    limitations: status === "NOT_RUN" ? ["Module was not executed."] : [],
  }));
  const blockingModules = findings.filter((finding) => finding.status === "BLOCKS_REVIEW").map((finding) => finding.module);
  const cautionModules = findings.filter((finding) => finding.status === "CAUTION" || finding.status === "NOT_RUN").map((finding) => finding.module);

  return {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1",
    targetReference: "H120_L050_C040",
    domain: "PRINT",
    readiness: blockingModules.length === 0 ? "READY_FOR_DECISION_SYNTHESIS" : "REQUIRES_ADDITIONAL_EVIDENCE",
    validationDecision: "READY_FOR_TECHNICAL_REVIEW",
    findings,
    blockingModules,
    cautionModules,
    evidenceBindings: findings.map(({ module, evidenceSha256 }) => ({ module, evidenceSha256 })),
    prohibitedClaims: [
      "VISUAL_EQUALITY_CONFIRMED",
      "SPECTRAL_EQUIVALENCE_CONFIRMED",
      "ROOT_CAUSE_CONFIRMED",
      "RECIPE_APPROVED",
      "PRODUCTION_RELEASE_GRANTED",
    ],
    claimBoundary: "Test contract.",
  };
}

test("supports technical review when all submitted modules support review", () => {
  const result = runIndustrialDecisionEngine(contractWith(["SUPPORTS_REVIEW", "SUPPORTS_REVIEW"]));

  assert.equal(result.outcome, "TECHNICAL_REVIEW_SUPPORTED");
  assert.equal(result.rationaleCode, "ALL_SUBMITTED_MODULES_SUPPORT_REVIEW");
  assert.equal(result.decisionSha256.length, 64);
  assert.ok(Object.isFrozen(result));
});

test("preserves caution and not-run findings", () => {
  const result = runIndustrialDecisionEngine(contractWith(["SUPPORTS_REVIEW", "CAUTION", "NOT_RUN"]));

  assert.equal(result.outcome, "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION");
  assert.deepEqual(result.cautionModules, ["SPECTRAL_INTELLIGENCE"]);
  assert.deepEqual(result.notRunModules, ["MIXLOCK"]);
});

test("blocking findings block technical review", () => {
  const result = runIndustrialDecisionEngine(contractWith(["SUPPORTS_REVIEW", "BLOCKS_REVIEW"]));

  assert.equal(result.outcome, "TECHNICAL_REVIEW_BLOCKED");
  assert.deepEqual(result.blockingModules, ["SPECTRAL_INTELLIGENCE"]);
});

test("decision hash is deterministic", () => {
  const contract = contractWith(["SUPPORTS_REVIEW", "CAUTION"]);

  assert.equal(runIndustrialDecisionEngine(contract).decisionSha256, runIndustrialDecisionEngine(contract).decisionSha256);
});
