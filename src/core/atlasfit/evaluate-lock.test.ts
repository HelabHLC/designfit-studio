import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAtlasFitRun } from "./evaluate-lock";
import type { AtlasFitAuditRun } from "./types";

const target = "H240_L050_C040" as const;
const sha256 = "a".repeat(64);

function completeRun(): Omit<AtlasFitAuditRun, "finalVerdict" | "missingEvidence"> {
  return {
    runId: "atlasfit-run-001",
    userRequest: { kind: "LAB_REQUEST", lab: { l: 50, a: 0, b: -40 } },
    boundReference: {
      targetReference: target,
      referenceSpace: "ARBE_ATLAS_MASTER_PKL",
      masterDatasetSha256: sha256,
      bindingMethod: "MASTER_PKL_NEAREST_CANDIDATE",
    },
    initialRecipeCandidate: {
      candidateId: "recipe-initial-001",
      candidateSpace: "EXTERNAL_PIGMENT_LIBRARY",
      components: [{ pigmentId: "PB29", fraction: 1, sourceClass: "RESTRICTED_INTERNAL" }],
      model: "KM_OPAQUE_INFINITE_LAYER_APPROXIMATION",
      isFinal: false,
    },
    initialCurveEvidence: { deltaE00: 1.2, spectralRmse: 0.03, targetRank: 2 },
    scissor: {
      status: "SCISSOR_LOCKED",
      crossingsBefore: 2,
      crossingsAfter: 0,
      nearestAfterCorrection: target,
      deltaDeltaLambdaNm: 0.4,
      allowedLambdaDriftNm: 1,
    },
    scissoredTargetLab: { l: 49.8, a: 0.2, b: -39.6 },
    refinedRecipeCandidate: {
      candidateId: "recipe-refined-001",
      candidateSpace: "EXTERNAL_PIGMENT_LIBRARY",
      components: [{ pigmentId: "PB29", fraction: 1, sourceClass: "RESTRICTED_INTERNAL" }],
      model: "KM_OPAQUE_INFINITE_LAYER_APPROXIMATION",
      isFinal: false,
    },
    finalCurveEvidence: {
      deltaE00: 0.3,
      spectralRmse: 0.008,
      targetRank: 1,
      nearestReference: target,
      lockMargin: 0.4,
    },
    metamerism: { status: "METAMERISM_LOW", method: "ARBE_METAMERISM_GATE" },
  };
}

test("emits qualified lock only after every gate passes", () => {
  const result = evaluateAtlasFitRun(completeRun());
  assert.equal(result.finalVerdict, "REFERENCE_LOCKED_METAMERISM_LOW");
  assert.deepEqual(result.missingEvidence, []);
});

test("rejects a Scissor claim when crossings remain", () => {
  const run = completeRun();
  const result = evaluateAtlasFitRun({
    ...run,
    scissor: { ...run.scissor!, crossingsAfter: 1 },
  });
  assert.equal(result.finalVerdict, "REFERENCE_UNLOCKED");
});

test("rejects reference lock when target rank is not one", () => {
  const run = completeRun();
  const result = evaluateAtlasFitRun({
    ...run,
    finalCurveEvidence: { ...run.finalCurveEvidence!, targetRank: 2 },
  });
  assert.equal(result.finalVerdict, "REFERENCE_UNLOCKED");
});

test("marks incomplete runs as not final", () => {
  const run = completeRun();
  const result = evaluateAtlasFitRun({ ...run, metamerism: undefined });
  assert.equal(result.finalVerdict, "NOT_FINAL_MISSING_EVIDENCE");
  assert.ok(result.missingEvidence.includes("metamerism"));
});
