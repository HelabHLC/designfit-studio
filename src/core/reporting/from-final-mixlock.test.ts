import assert from "node:assert/strict";
import test from "node:test";
import type { FinalMixLockEvidence } from "../mixlock";
import { buildMixLockReport } from "./from-final-mixlock";

const evidence = {
  status: "REFERENCE_LOCKED_METAMERISM_LOW",
  targetReference: "H180_L050_C040",
  finalVerdict: "FINAL_REFERENCE_LOCK",
  limitations: ["Not a production approval."],
  initialCandidate: {
    recipe: [
      { pigmentId: "Candidate A", normalizedWeight: 0.6 },
      { pigmentId: "Candidate B", normalizedWeight: 0.4 },
    ],
  },
  scissor: {
    correction: { crossingsBefore: 4, crossingsAfter: 0 },
    structuralDrift: {
      lambdaV2Nm: 555,
      lambdaEeNm: 553,
      deltaLambdaNm: 2,
      masterDeltaLambdaNm: 1.5,
      deltaDeltaLambdaNm: 0.5,
      driftStatus: "STABLE",
      lambdaV2Method: "Brent",
    },
  },
  secondRecipe: {
    recipe: [
      { pigmentId: "Candidate A", normalizedWeight: 0.55 },
      { pigmentId: "Candidate B", normalizedWeight: 0.45 },
    ],
    atlasFit: {
      nearestReference: "H180_L050_C040",
      targetRank: 1,
      spectralRmse: 0.004,
      lockMargin: 0.012,
    },
  },
  metamerism: {
    maximumDeltaE00: 0.7,
    maximumIlluminant: "A",
    evaluations: [
      { illuminant: "D50", deltaE00: 0.2 },
      { illuminant: "A", deltaE00: 0.7 },
    ],
  },
} as unknown as FinalMixLockEvidence;

const request = { type: "Lab request", value: "50, 0, 0" };
const audit = {
  reportId: "ARBE-MLR-0001",
  generatedAt: "2026-07-14T14:00:00Z",
  runtimeVersion: "ARBE Runtime v1",
  runtimeCommit: "a".repeat(40),
  datasetId: "ARBE_MASTER_RUNTIME",
  datasetSha256: "b".repeat(64),
};

test("maps complete FinalMixLock evidence into a high-confidence report", () => {
  const report = buildMixLockReport(evidence, request, audit);
  assert.equal(report.finalVerdict, "FINAL_REFERENCE_LOCK");
  assert.equal(report.confidence, "HIGH");
  assert.equal(report.reference.nearestReference, evidence.targetReference);
  assert.equal(report.reference.targetRank, 1);
  assert.equal(report.scissor.crossingsAfter, 0);
  assert.equal(report.recipe2[0].weight, 0.55);
  assert.equal(report.metamerism.classification, "LOW");
  assert.equal(report.audit.lambdaV2Method, "Brent");
});

test("rejects evidence that is missing mandatory final stages", () => {
  const incomplete = { ...evidence, metamerism: undefined } as unknown as FinalMixLockEvidence;
  assert.throws(
    () => buildMixLockReport(incomplete, request, audit),
    /Final MixLock evidence is incomplete/,
  );
});
