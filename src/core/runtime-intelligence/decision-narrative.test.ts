import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "./orchestrator";
import { createExplainableRuntimeDecision } from "./explainable-decision-engine";
import { createDecisionNarrative } from "./decision-narrative";

test("creates a bounded narrative for a report-bindable runtime", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  const narrative = createDecisionNarrative(createExplainableRuntimeDecision(runtime));
  assert.equal(narrative.schemaVersion, "ARBE_DECISION_NARRATIVE_V1");
  assert.equal(narrative.paragraphs.length, 3);
  assert.match(narrative.paragraphs[2], /no recipe approval or production release/i);
  assert.equal(Object.isFrozen(narrative), true);
  assert.equal(Object.isFrozen(narrative.paragraphs), true);
});

test("names the blocking evidence without inferring downstream results", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H005_L070_C030",
    referenceGateway: { status: "INVALID", reason: "Reference evidence integrity failed." },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: true },
  });
  const narrative = createDecisionNarrative(createExplainableRuntimeDecision(runtime));
  assert.match(narrative.paragraphs[1], /Reference binding blocked/);
  assert.match(narrative.paragraphs[2], /no basis for inference/i);
});

test("is deterministic for identical explanations", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H005_L070_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: true, evidence: { status: "VALID", evidenceId: "recipe-sha256" } },
  });
  const explanation = createExplainableRuntimeDecision(runtime);
  assert.deepEqual(createDecisionNarrative(explanation), createDecisionNarrative(explanation));
});
