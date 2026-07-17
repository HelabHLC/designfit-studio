import assert from "node:assert/strict";
import test from "node:test";

import { createIndustrialDecisionGraph } from "./decision-graph";
import { createIndustrialDecisionLedger, verifyIndustrialDecisionLedger } from "./decision-ledger";
import type { IndustrialDecisionContract } from "./industrial-decision-contract";
import { runIndustrialDecisionEngine } from "./industrial-decision-engine";

function contract(): IndustrialDecisionContract {
  const findings = [
    {
      module: "ATLASFIT" as const,
      status: "SUPPORTS_REVIEW" as const,
      evidenceSha256: "a".repeat(64),
      summary: "AtlasFit supports technical review.",
      limitations: [] as const,
    },
    {
      module: "SPECTRAL_INTELLIGENCE" as const,
      status: "CAUTION" as const,
      evidenceSha256: "b".repeat(64),
      summary: "Structural caution remains.",
      limitations: ["One spectral region remains uncertain."] as const,
    },
  ];

  return {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1",
    targetReference: "H120_L050_C040",
    domain: "PRINT",
    readiness: "READY_FOR_DECISION_SYNTHESIS",
    validationDecision: "READY_FOR_TECHNICAL_REVIEW",
    findings,
    blockingModules: [],
    cautionModules: ["SPECTRAL_INTELLIGENCE"],
    evidenceBindings: findings.map(({ module, evidenceSha256 }) => ({ module, evidenceSha256 })),
    prohibitedClaims: [
      "VISUAL_EQUALITY_CONFIRMED",
      "SPECTRAL_EQUIVALENCE_CONFIRMED",
      "ROOT_CAUSE_CONFIRMED",
      "RECIPE_APPROVED",
      "PRODUCTION_RELEASE_GRANTED",
    ],
    claimBoundary: "Test contract boundary.",
  };
}

function artifacts() {
  const decisionContract = contract();
  const result = runIndustrialDecisionEngine(decisionContract);
  const graph = createIndustrialDecisionGraph(decisionContract, result);
  return { decisionContract, result, graph };
}

test("creates a deterministic three-entry hash chain", () => {
  const { decisionContract, result, graph } = artifacts();
  const ledger = createIndustrialDecisionLedger(decisionContract, result, graph);

  assert.equal(ledger.entries.length, 3);
  assert.equal(ledger.entries[0].previousEntrySha256, null);
  assert.equal(ledger.entries[1].previousEntrySha256, ledger.entries[0].entrySha256);
  assert.equal(ledger.entries[2].previousEntrySha256, ledger.entries[1].entrySha256);
  assert.equal(ledger.headEntrySha256, ledger.entries[2].entrySha256);
  assert.equal(ledger.integrity, "VERIFIED");
  assert.equal(verifyIndustrialDecisionLedger(ledger), true);
  assert.ok(Object.isFrozen(ledger));
});

test("produces the same ledger hash for identical artifacts", () => {
  const { decisionContract, result, graph } = artifacts();

  assert.equal(
    createIndustrialDecisionLedger(decisionContract, result, graph).ledgerSha256,
    createIndustrialDecisionLedger(decisionContract, result, graph).ledgerSha256,
  );
});

test("detects a modified ledger entry", () => {
  const { decisionContract, result, graph } = artifacts();
  const ledger = createIndustrialDecisionLedger(decisionContract, result, graph);
  const altered = {
    ...ledger,
    entries: [
      ledger.entries[0],
      { ...ledger.entries[1], artifactSha256: "c".repeat(64) },
      ledger.entries[2],
    ],
  } as typeof ledger;

  assert.equal(verifyIndustrialDecisionLedger(altered), false);
});

test("rejects a graph that does not bind the supplied decision", () => {
  const { decisionContract, result, graph } = artifacts();
  const alteredGraph = { ...graph, rootNodeId: `decision:${"d".repeat(64)}` };

  assert.throws(
    () => createIndustrialDecisionLedger(decisionContract, result, alteredGraph),
    /graph root must bind/,
  );
});
