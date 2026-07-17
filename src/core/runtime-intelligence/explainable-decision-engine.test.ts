import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "./orchestrator";
import { createExplainableRuntimeDecision } from "./explainable-decision-engine";

test("explains a report-bindable runtime without granting approval", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });

  const explanation = createExplainableRuntimeDecision(runtime);

  assert.equal(explanation.decision, "READY_FOR_REPORT_BINDING");
  assert.match(explanation.headline, /ready for integrity-bound report creation/);
  assert.equal(explanation.findings.length, 4);
  assert.equal(explanation.findings[2].severity, "CAUTION");
  assert.match(explanation.nextAction, /technical review/);
  assert.ok(explanation.prohibitedClaims.includes("Recipe approval"));
  assert.ok(explanation.limitations.some((item) => item.includes("not recipe approval or production release")));
  assert.equal(Object.isFrozen(explanation), true);
  assert.equal(Object.isFrozen(explanation.findings), true);
});

test("explains the blocking stage and prevents downstream inference", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "INVALID", reason: "Spectral evidence integrity failed." },
    recipeIntelligence: { requested: true },
  });

  const explanation = createExplainableRuntimeDecision(runtime);

  assert.equal(explanation.decision, "STOPPED_BY_REQUIRED_STAGE");
  assert.match(explanation.headline, /SPECTRAL_INTELLIGENCE/);
  assert.match(explanation.summary, /No downstream decision may be inferred/);
  assert.equal(explanation.findings[1].severity, "BLOCKING");
  assert.equal(explanation.findings[2].status, "NOT_RUN");
  assert.match(explanation.nextAction, /execute the runtime again/);
});

test("is deterministic for identical runtime evidence", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H005_L070_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: {
      requested: true,
      evidence: { status: "VALID", evidenceId: "recipe-sha256" },
    },
  });

  assert.deepEqual(
    createExplainableRuntimeDecision(runtime),
    createExplainableRuntimeDecision(runtime),
  );
});
