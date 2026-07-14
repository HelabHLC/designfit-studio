import assert from "node:assert/strict";
import test from "node:test";
import { deriveReportConfidence } from "./mixlock-report";

const base = {
  finalVerdict: "FINAL_REFERENCE_LOCK" as const,
  finalStatus: "REFERENCE_LOCKED_METAMERISM_LOW" as const,
  reference: { nearestReference: "H075_L080_C100", targetRank: 1 },
  scissor: {
    crossingsBefore: 2,
    crossingsAfter: 0,
    lambdaV2Nm: 550,
    lambdaEeNm: 548,
    deltaLambdaNm: 2,
    masterDeltaLambdaNm: 2,
    deltaDeltaLambdaNm: 0,
    driftStatus: "STABLE" as const,
  },
};

test("reports high confidence only for final low-metamerism stable rank-1 lock", () => {
  assert.equal(deriveReportConfidence(base), "HIGH");
});

test("reports low confidence for a non-final verdict", () => {
  assert.equal(deriveReportConfidence({ ...base, finalVerdict: "NOT_FINAL" }), "LOW");
});

test("reports medium confidence for a warning-qualified final lock", () => {
  assert.equal(
    deriveReportConfidence({ ...base, finalStatus: "REFERENCE_LOCKED_METAMERISM_WARNING" }),
    "MEDIUM",
  );
});
