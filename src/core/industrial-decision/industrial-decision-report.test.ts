import assert from "node:assert/strict";
import test from "node:test";
import type { IndustrialDecisionContract } from "./industrial-decision-contract";
import { createIndustrialDecisionGraph } from "./decision-graph";
import { runIndustrialDecisionEngine } from "./industrial-decision-engine";
import { createIndustrialDecisionLedger } from "./decision-ledger";
import { createIndustrialDecisionReport } from "./industrial-decision-report";

function makeContract(status: "SUPPORTS_REVIEW" | "CAUTION" | "BLOCKS_REVIEW"): IndustrialDecisionContract {
  const evidenceSha256 = "a".repeat(64);
  return {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1",
    targetReference: "H120_L050_C040",
    domain: "PRINT",
    readiness: status === "BLOCKS_REVIEW" ? "REQUIRES_ADDITIONAL_EVIDENCE" : "READY_FOR_DECISION_SYNTHESIS",
    validationDecision: "READY_FOR_TECHNICAL_REVIEW",
    findings: [{ module: "ATLASFIT", status, evidenceSha256, summary: "Test finding", limitations: [] }],
    blockingModules: status === "BLOCKS_REVIEW" ? ["ATLASFIT"] : [],
    cautionModules: status === "CAUTION" ? ["ATLASFIT"] : [],
    evidenceBindings: [{ module: "ATLASFIT", evidenceSha256 }],
    prohibitedClaims: ["VISUAL_EQUALITY_CONFIRMED", "SPECTRAL_EQUIVALENCE_CONFIRMED", "ROOT_CAUSE_CONFIRMED", "RECIPE_APPROVED", "PRODUCTION_RELEASE_GRANTED"],
    claimBoundary: "Test contract.",
  };
}

function makeReport(status: "SUPPORTS_REVIEW" | "CAUTION" | "BLOCKS_REVIEW") {
  const contract = makeContract(status);
  const result = runIndustrialDecisionEngine(contract);
  const graph = createIndustrialDecisionGraph(contract, result);
  const ledger = createIndustrialDecisionLedger(contract, result, graph);
  return createIndustrialDecisionReport(contract, result, graph, ledger);
}

test("renders practitioner decision and technical proof", () => {
  const report = makeReport("SUPPORTS_REVIEW");
  assert.equal(report.practitioner.decision, "CONTINUE");
  assert.equal(report.practitioner.risk, "LOW");
  assert.equal(report.technicalEvidence.ledgerIntegrity, "VERIFIED");
  assert.equal(report.reportSha256.length, 64);
  assert.ok(Object.isFrozen(report));
});

test("surfaces caution with a concrete next action", () => {
  const report = makeReport("CAUTION");
  assert.equal(report.practitioner.decision, "CONTINUE_WITH_CAUTION");
  assert.match(report.practitioner.nextAction, /ATLASFIT/);
});

test("blocks continuation for blocking findings", () => {
  const report = makeReport("BLOCKS_REVIEW");
  assert.equal(report.practitioner.decision, "DO_NOT_CONTINUE");
  assert.equal(report.practitioner.risk, "HIGH");
});

test("report hash is deterministic", () => {
  assert.equal(makeReport("CAUTION").reportSha256, makeReport("CAUTION").reportSha256);
});
