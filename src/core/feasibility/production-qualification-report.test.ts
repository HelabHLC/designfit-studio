import assert from "node:assert/strict";
import test from "node:test";

import { qualifyFeasibility } from "./qualification-engine";
import { createProductionQualificationReport } from "./production-qualification-report";

function context() {
  return {
    materialSystem: "textile",
    substrate: "cotton",
    colorantSystem: "reactive dyes",
    processRoute: "exhaust dyeing",
    illuminants: ["D65", "A"],
    toleranceDeltaE00: 1,
    requiredFastness: { wash: "4" },
  } as const;
}

test("creates a deterministic complete production qualification report", () => {
  const qualification = qualifyFeasibility({
    qualificationId: "qual.001",
    referenceId: "hlc.h030_l060_c040",
    context: context(),
    evidence: [
      { evidenceId: "ev.reference", evidenceType: "SPECTRAL_REFERENCE", source: "governed atlas" },
      { evidenceId: "ev.recipe", evidenceType: "RECIPE_PREDICTION", source: "prediction engine" },
      { evidenceId: "ev.gamut", evidenceType: "PROCESS_GAMUT", source: "process model" },
      { evidenceId: "ev.fastness", evidenceType: "FASTNESS_PREDICTION", source: "fastness model" },
      { evidenceId: "ev.trial", evidenceType: "TRIAL_MEASUREMENT", source: "trial lot" },
    ],
    criteria: [
      { criterionId: "criterion.color", title: "Colour tolerance", required: true, result: "PASS", evidenceIds: ["ev.reference", "ev.trial"] },
      { criterionId: "criterion.recipe", title: "Recipe available", required: true, result: "PASS", evidenceIds: ["ev.recipe"] },
      { criterionId: "criterion.gamut", title: "Inside process gamut", required: true, result: "PASS", evidenceIds: ["ev.gamut"] },
      { criterionId: "criterion.fastness", title: "Fastness target", required: true, result: "PASS", evidenceIds: ["ev.fastness"] },
    ],
  });

  const first = createProductionQualificationReport(qualification);
  const second = createProductionQualificationReport(qualification);

  assert.equal(first.decision, "APPROVED_FOR_DEFINED_CONTEXT");
  assert.equal(first.evidenceSummary.completeness, "COMPLETE");
  assert.equal(first.criterionSummary.failed.length, 0);
  assert.equal(first.reportSha256, second.reportSha256);
  assert.equal(first.reportSha256.length, 64);
  assert.ok(Object.isFrozen(first));
  assert.match(first.claimBoundary, /does not establish universal manufacturability/);
});

test("reports blocking criteria for a rejected production context", () => {
  const qualification = qualifyFeasibility({
    qualificationId: "qual.002",
    referenceId: "hlc.h030_l060_c040",
    context: context(),
    evidence: [{ evidenceId: "ev.fail", evidenceType: "PROCESS_GAMUT", source: "process model" }],
    criteria: [
      { criterionId: "criterion.gamut", title: "Inside process gamut", required: true, result: "FAIL", evidenceIds: ["ev.fail"] },
    ],
  });

  const report = createProductionQualificationReport(qualification);

  assert.equal(report.decision, "REJECTED_FOR_DEFINED_CONTEXT");
  assert.deepEqual(report.criterionSummary.blocking, ["criterion.gamut"]);
  assert.match(report.nextAction, /criterion.gamut/);
});

test("marks unevaluated qualifications as evidence required", () => {
  const qualification = qualifyFeasibility({
    qualificationId: "qual.003",
    referenceId: "hlc.h030_l060_c040",
    context: context(),
    evidence: [],
    criteria: [],
  });

  const report = createProductionQualificationReport(qualification);

  assert.equal(report.decision, "EVIDENCE_REQUIRED");
  assert.equal(report.evidenceSummary.completeness, "INSUFFICIENT");
  assert.equal(report.criterionSummary.total, 0);
});
