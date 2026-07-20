import assert from "node:assert/strict";
import test from "node:test";

import { qualifyFeasibility } from "./qualification-engine";
import { createProductionQualificationReport } from "./production-qualification-report";

function qualification() {
  return qualifyFeasibility({
    qualificationId: "qual.h030.textile.01",
    referenceId: "hlc.h030_l060_c040",
    context: {
      materialSystem: "polyester textile",
      substrate: "woven polyester",
      colorantSystem: "disperse dyes",
      processRoute: "high-temperature exhaust dyeing",
      illuminants: ["D65", "A"],
      toleranceDeltaE00: 1.0,
      requiredFastness: { washing: "4", light: "6" },
    },
    evidence: [
      { evidenceId: "ev.reference", evidenceType: "SPECTRAL_REFERENCE", source: "HLC Atlas", referenceId: "hlc.h030_l060_c040" },
      { evidenceId: "ev.recipe", evidenceType: "RECIPE_PREDICTION", source: "synthetic prediction" },
      { evidenceId: "ev.fastness", evidenceType: "FASTNESS_PREDICTION", source: "synthetic prediction" },
    ],
    criteria: [
      { criterionId: "colour-tolerance", title: "Colour tolerance", required: true, result: "PASS", evidenceIds: ["ev.reference", "ev.recipe"] },
      { criterionId: "fastness", title: "Fastness", required: true, result: "PASS", evidenceIds: ["ev.fastness"] },
    ],
  });
}

test("creates a deterministic production qualification report", () => {
  const first = createProductionQualificationReport(qualification());
  const second = createProductionQualificationReport(qualification());

  assert.equal(first.schemaVersion, "ARBE_PRODUCTION_QUALIFICATION_REPORT_V1");
  assert.equal(first.qualificationStatus, "FEASIBLE");
  assert.equal(first.recommendation, "PROCEED_TO_CONTROLLED_TRIAL");
  assert.equal(first.evidenceSummary.total, 3);
  assert.deepEqual(first.criteriaSummary.passed, ["colour-tolerance", "fastness"]);
  assert.equal(first.reportSha256, second.reportSha256);
  assert.equal(first.qualificationFingerprint, second.qualificationFingerprint);
  assert.equal(Object.isFrozen(first), true);
});

test("reports blocking and unresolved qualification conditions", () => {
  const blocked = qualifyFeasibility({
    qualificationId: "qual.blocked.01",
    referenceId: "hlc.h030_l060_c040",
    context: {
      materialSystem: "coated paper",
      substrate: "paper",
      colorantSystem: "process inks",
      processRoute: "offset printing",
      illuminants: ["D50"],
      toleranceDeltaE00: 2,
    },
    evidence: [{ evidenceId: "ev.gamut", evidenceType: "PROCESS_GAMUT", source: "synthetic gamut" }],
    criteria: [
      { criterionId: "gamut", title: "Inside process gamut", required: true, result: "FAIL", evidenceIds: ["ev.gamut"] },
      { criterionId: "trial", title: "Trial measurement", required: false, result: "UNKNOWN", evidenceIds: [] },
    ],
  });
  const report = createProductionQualificationReport(blocked);

  assert.equal(report.recommendation, "DO_NOT_PROCEED");
  assert.deepEqual(report.blockingCriterionIds, ["gamut"]);
  assert.deepEqual(report.unresolvedCriterionIds, ["trial"]);
  assert.match(report.nextActions[0], /gamut/);
  assert.match(report.claimBoundary, /does not redefine colour identity/);
});
