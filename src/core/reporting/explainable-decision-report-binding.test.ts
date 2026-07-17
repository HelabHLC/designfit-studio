import assert from "node:assert/strict";
import test from "node:test";
import { createExplainableRuntimeDecision, orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createExplainableDecisionReportBinding, verifyExplainableDecisionReportBinding } from "./explainable-decision-report-binding";

function explanation() {
  return createExplainableRuntimeDecision(orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  }));
}

test("creates a deterministic integrity-bound explainable decision report", () => {
  const left = createExplainableDecisionReportBinding(explanation());
  const right = createExplainableDecisionReportBinding(explanation());
  assert.deepEqual(left, right);
  assert.equal(left.payload.targetReference, "H250_L050_C030");
  assert.equal(left.payload.decision, "READY_FOR_REPORT_BINDING");
  assert.equal(verifyExplainableDecisionReportBinding(left), true);
  assert.equal(Object.isFrozen(left.payload.explanation), true);
});

test("detects report payload tampering", () => {
  const report = createExplainableDecisionReportBinding(explanation());
  const tampered = {
    ...report,
    payload: { ...report.payload, decision: "STOPPED_BY_REQUIRED_STAGE" as const },
  };
  assert.equal(verifyExplainableDecisionReportBinding(tampered), false);
});
