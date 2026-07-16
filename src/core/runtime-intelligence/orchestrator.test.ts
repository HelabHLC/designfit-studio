import assert from "node:assert/strict";
import test from "node:test";
import { orchestrateRuntimeIntelligence } from "./orchestrator";

const target = "H250_L050_C030";
const valid = (evidenceId: string) => ({ status: "VALID" as const, evidenceId });

test("completes required stages and records an explicit recipe skip", () => {
  const result = orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: valid("gateway-hash"),
    spectralIntelligence: valid("spectral-package-hash"),
    recipeIntelligence: { requested: false, skipReason: "No recipe candidates were supplied for this runtime request." },
  });
  assert.equal(result.overallStatus, "READY_FOR_REPORT_BINDING");
  assert.deepEqual(result.stages.map((stage) => stage.status), ["COMPLETED", "COMPLETED", "SKIPPED_WITH_EVIDENCE", "READY_FOR_BINDING"]);
  assert.equal(result.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"), true);
});

test("completes recipe intelligence when valid evidence is supplied", () => {
  const result = orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: valid("gateway-hash"),
    spectralIntelligence: valid("spectral-package-hash"),
    recipeIntelligence: { requested: true, evidence: valid("recipe-package-hash") },
  });
  assert.equal(result.stages[2].status, "COMPLETED");
  assert.equal(result.stages[3].status, "READY_FOR_BINDING");
});

test("stops after invalid required evidence", () => {
  const referenceStop = orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: { status: "INVALID", reason: "Gateway integrity failed." },
    spectralIntelligence: valid("unused"),
    recipeIntelligence: { requested: false, skipReason: "Not reached." },
  });
  assert.equal(referenceStop.stoppedAt, "REFERENCE_GATEWAY");
  assert.equal(referenceStop.stages[1].status, "NOT_RUN");

  const spectralStop = orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: valid("gateway-hash"),
    spectralIntelligence: { status: "MISSING", reason: "Spectral package absent." },
    recipeIntelligence: { requested: false, skipReason: "Not reached." },
  });
  assert.equal(spectralStop.stoppedAt, "SPECTRAL_INTELLIGENCE");
  assert.equal(spectralStop.stages[2].status, "NOT_RUN");
});

test("requires HLC identity and explicit skip evidence", () => {
  assert.throws(() => orchestrateRuntimeIntelligence({
    targetReference: "#336699",
    referenceGateway: valid("gateway"),
    spectralIntelligence: valid("spectral"),
    recipeIntelligence: { requested: false, skipReason: "No recipe." },
  }), /Hxxx_Lxxx_Cxxx/);

  assert.throws(() => orchestrateRuntimeIntelligence({
    targetReference: target,
    referenceGateway: valid("gateway"),
    spectralIntelligence: valid("spectral"),
    recipeIntelligence: { requested: false },
  }), /explicit skip evidence/);
});

test("returns deeply frozen deterministic results", () => {
  const input = {
    targetReference: target,
    referenceGateway: valid("gateway"),
    spectralIntelligence: valid("spectral"),
    recipeIntelligence: { requested: true, evidence: valid("recipe") },
  };
  const left = orchestrateRuntimeIntelligence(input);
  const right = orchestrateRuntimeIntelligence(input);
  assert.deepEqual(left, right);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.stages), true);
  assert.equal(Object.isFrozen(left.stages[0]), true);
});
