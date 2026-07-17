import assert from "node:assert/strict";
import test from "node:test";

import type { IndustrialDecisionContract } from "./industrial-decision-contract";
import { createIndustrialDecisionGraph } from "./decision-graph";
import { runIndustrialDecisionEngine } from "./industrial-decision-engine";

const evidenceSha = "a".repeat(64);

function contract(): IndustrialDecisionContract {
  const findings = [
    {
      module: "ATLASFIT" as const,
      status: "SUPPORTS_REVIEW" as const,
      evidenceSha256: evidenceSha,
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
    claimBoundary: "Test contract.",
  };
}

test("builds a deterministic acyclic evidence-to-decision graph", () => {
  const input = contract();
  const result = runIndustrialDecisionEngine(input);
  const graph = createIndustrialDecisionGraph(input, result);

  assert.equal(graph.nodes.length, 6);
  assert.equal(graph.edges.length, 5);
  assert.equal(graph.rootNodeId, `decision:${result.decisionSha256}`);
  assert.equal(graph.topologicalOrder.at(-1), graph.rootNodeId);
  assert.equal(graph.graphSha256.length, 64);
  assert.ok(Object.isFrozen(graph));
});

test("produces the same graph hash for the same decision inputs", () => {
  const input = contract();
  const result = runIndustrialDecisionEngine(input);

  assert.equal(
    createIndustrialDecisionGraph(input, result).graphSha256,
    createIndustrialDecisionGraph(input, result).graphSha256,
  );
});

test("rejects an engine result with a changed evidence binding", () => {
  const input = contract();
  const result = runIndustrialDecisionEngine(input);
  const altered = {
    ...result,
    evidenceBindings: [{ module: "ATLASFIT" as const, evidenceSha256: "c".repeat(64) }, ...result.evidenceBindings.slice(1)],
  };

  assert.throws(() => createIndustrialDecisionGraph(input, altered), /evidence binding mismatch/);
});
