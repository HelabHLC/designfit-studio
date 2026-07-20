import assert from "node:assert/strict";
import test from "node:test";

import { qualifyFeasibility } from "./qualification-engine";

const context = {
  materialSystem: "synthetic textile",
  substrate: "polyester knit",
  colorantSystem: "disperse dyes",
  processRoute: "lab dip then production dyeing",
  illuminants: ["D65", "A"],
  toleranceDeltaE00: 1.0,
  requiredFastness: { washing: "4", light: "5" },
};

const evidence = [
  { evidenceId: "ev.reference", evidenceType: "SPECTRAL_REFERENCE" as const, source: "Synthetic Atlas", referenceId: "hlc.h030_l060_c040" },
  { evidenceId: "ev.recipe", evidenceType: "RECIPE_PREDICTION" as const, source: "Synthetic predictor" },
  { evidenceId: "ev.fastness", evidenceType: "FASTNESS_PREDICTION" as const, source: "Synthetic predictor" },
];

test("qualifies a fully evidenced required criteria set as feasible", () => {
  const result = qualifyFeasibility({
    qualificationId: "qualification.001",
    referenceId: "hlc.h030_l060_c040",
    context,
    evidence,
    criteria: [
      { criterionId: "colour-match", title: "Colour match", required: true, result: "PASS", evidenceIds: ["ev.reference", "ev.recipe"] },
      { criterionId: "fastness", title: "Fastness", required: true, result: "PASS", evidenceIds: ["ev.fastness"] },
    ],
  });

  assert.equal(result.status, "FEASIBLE");
  assert.deepEqual(result.blockingCriterionIds, []);
  assert.deepEqual(result.unresolvedCriterionIds, []);
  assert.match(result.statement, /qualified as feasible/);
});

test("marks required failures as not feasible with stable blockers", () => {
  const result = qualifyFeasibility({
    qualificationId: "qualification.002",
    referenceId: "hlc.h030_l060_c040",
    context,
    evidence,
    criteria: [
      { criterionId: "fastness", title: "Fastness", required: true, result: "FAIL", evidenceIds: ["ev.fastness"] },
      { criterionId: "colour-match", title: "Colour match", required: true, result: "FAIL", evidenceIds: ["ev.recipe"] },
    ],
  });

  assert.equal(result.status, "NOT_FEASIBLE");
  assert.deepEqual(result.blockingCriterionIds, ["colour-match", "fastness"]);
});

test("keeps unresolved required criteria conditional", () => {
  const result = qualifyFeasibility({
    qualificationId: "qualification.003",
    referenceId: "hlc.h030_l060_c040",
    context,
    evidence,
    criteria: [
      { criterionId: "colour-match", title: "Colour match", required: true, result: "PASS", evidenceIds: ["ev.recipe"] },
      { criterionId: "production-trial", title: "Production trial", required: true, result: "UNKNOWN", evidenceIds: [] },
    ],
  });

  assert.equal(result.status, "CONDITIONAL");
  assert.deepEqual(result.unresolvedCriterionIds, ["production-trial"]);
});

test("rejects unsupported evidence references and unevidenced pass/fail results", () => {
  assert.throws(() => qualifyFeasibility({
    qualificationId: "qualification.004",
    referenceId: "hlc.h030_l060_c040",
    context,
    evidence,
    criteria: [{ criterionId: "colour-match", title: "Colour match", required: true, result: "PASS", evidenceIds: ["missing"] }],
  }), /unknown evidence/);

  assert.throws(() => qualifyFeasibility({
    qualificationId: "qualification.005",
    referenceId: "hlc.h030_l060_c040",
    context,
    evidence,
    criteria: [{ criterionId: "colour-match", title: "Colour match", required: true, result: "FAIL", evidenceIds: [] }],
  }), /requires evidence/);
});
