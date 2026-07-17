import assert from "node:assert/strict";
import test from "node:test";
import { createDecisionNarrative, createExplainableRuntimeDecision, orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import { createDecisionNarrativeReportBinding, verifyDecisionNarrativeReportBinding } from "./decision-narrative-report-binding";

function readyNarrative() {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H250_L050_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "VALID", evidenceId: "spectral-sha256" },
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
  return createDecisionNarrative(createExplainableRuntimeDecision(runtime));
}

test("creates a deterministic integrity-bound narrative report", () => {
  const narrative = readyNarrative();
  const left = createDecisionNarrativeReportBinding(narrative);
  const right = createDecisionNarrativeReportBinding(narrative);

  assert.deepEqual(left, right);
  assert.equal(left.payload.targetReference, "H250_L050_C030");
  assert.equal(left.payload.paragraphCount, 3);
  assert.equal(verifyDecisionNarrativeReportBinding(left), true);
  assert.equal(Object.isFrozen(left.payload.narrative), true);
  assert.match(left.payload.claimBoundary, /does not add scientific evidence/);
});

test("binds stopped narratives without permitting downstream inference", () => {
  const runtime = orchestrateRuntimeIntelligence({
    targetReference: "H005_L070_C030",
    referenceGateway: { status: "VALID", evidenceId: "gateway-sha256" },
    spectralIntelligence: { status: "INVALID", reason: "Spectral evidence integrity failed." },
    recipeIntelligence: { requested: true },
  });
  const report = createDecisionNarrativeReportBinding(
    createDecisionNarrative(createExplainableRuntimeDecision(runtime)),
  );

  assert.equal(report.payload.decision, "STOPPED_BY_REQUIRED_STAGE");
  assert.match(report.payload.narrative.paragraphs.join(" "), /provide no basis for inference/);
  assert.equal(verifyDecisionNarrativeReportBinding(report), true);
});

test("detects narrative report tampering", () => {
  const report = createDecisionNarrativeReportBinding(readyNarrative());
  const tampered = {
    ...report,
    payload: { ...report.payload, paragraphCount: 99 },
  };

  assert.equal(verifyDecisionNarrativeReportBinding(tampered), false);
});
