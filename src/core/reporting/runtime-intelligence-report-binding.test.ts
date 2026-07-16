import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "../runtime-intelligence";
import {
  createRuntimeIntelligenceReportBinding,
  verifyRuntimeIntelligenceReportBinding,
} from "./runtime-intelligence-report-binding";

const target = "H250_L050_C030";
const valid = (evidenceId: string) => ({ status: "VALID" as const, evidenceId });

function readyResult() {
  return orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: valid("gateway-hash"),
    spectralIntelligence: valid("spectral-hash"),
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates supplied." },
  });
}

test("creates deterministic verifiable runtime report binding", () => {
  const left = createRuntimeIntelligenceReportBinding(readyResult());
  const right = createRuntimeIntelligenceReportBinding(readyResult());
  assert.deepEqual(left, right);
  assert.equal(verifyRuntimeIntelligenceReportBinding(left), true);
  assert.equal(left.payload.runtimeStatus, "READY_FOR_REPORT_BINDING");
  assert.equal(left.payload.skippedStageCount, 1);
});

test("binds stopped runtime evidence without treating it as success", () => {
  const stopped = orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: { status: "INVALID", reason: "Gateway integrity failed." },
    spectralIntelligence: valid("unused"),
    recipeIntelligence: { requested: false, skipReason: "Not reached." },
  });
  const report = createRuntimeIntelligenceReportBinding(stopped);
  assert.equal(report.payload.runtimeStatus, "STOPPED_BY_REQUIRED_STAGE");
  assert.equal(report.payload.stoppedAt, "REFERENCE_GATEWAY");
  assert.equal(verifyRuntimeIntelligenceReportBinding(report), true);
});

test("detects tampering and lost claim boundaries", () => {
  const report = createRuntimeIntelligenceReportBinding(readyResult());
  const tampered = { ...report, payload: { ...report.payload, completedStageCount: 99 } };
  assert.equal(verifyRuntimeIntelligenceReportBinding(tampered), false);

  const weakenedResult = {
    ...readyResult(),
    prohibitedClaims: readyResult().prohibitedClaims.filter((claim) => claim !== "PRODUCTION_RELEASE_GRANTED"),
  };
  assert.throws(() => createRuntimeIntelligenceReportBinding(weakenedResult), /prohibited claims/);
});

test("returns deeply frozen report objects", () => {
  const report = createRuntimeIntelligenceReportBinding(readyResult());
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload), true);
  assert.equal(Object.isFrozen(report.payload.runtimeResult), true);
  assert.equal(Object.isFrozen(report.payload.runtimeResult.stages), true);
});
