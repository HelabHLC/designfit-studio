import assert from "node:assert/strict";
import test from "node:test";
import type { AtlasFitEvidence } from "../atlasfit";
import type { MetamerismEvidence } from "../metamerism";
import type { ScissorPipelineEvidence, StructuralDriftEvidence } from "../scissor";
import { createSpectralIntelligenceSummary } from "./summary";

const targetReference = "H250_L050_C030";

const atlasFit: AtlasFitEvidence = {
  status: "REFERENCE_LOCKED",
  targetReference,
  nearestReference: targetReference,
  targetRank: 1,
  spectralRmse: 0.01,
  nearestRmse: 0.01,
  secondNearestRmse: 0.03,
  lockMargin: 0.02,
  comparedReferenceCount: 100,
  method: "SPECTRAL_RMSE_36_BAND_380_730_10NM",
  limitations: [],
};

const spectralScissor: ScissorPipelineEvidence = {
  status: "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR",
  targetReference,
  descriptorGate: "PENDING_LAMBDA_V2_EVALUATION",
  verdict: "NOT_FINAL",
  limitations: [],
};

const structuralDrift: StructuralDriftEvidence = {
  lambdaV2Nm: 510,
  lambdaEeNm: 500,
  deltaLambdaNm: 10,
  masterDeltaLambdaNm: 8,
  deltaDeltaLambdaNm: 2,
  driftStatus: "STABLE",
  method: "ARBE_STRUCTURAL_DRIFT_V04",
  lambdaV2Method: "Brent",
};

const metamerism: MetamerismEvidence = {
  status: "REFERENCE_LOCKED_METAMERISM_LOW",
  targetReference,
  referenceLocked: true,
  evaluations: [
    { illuminant: "D50", deltaE00: 0.4 },
    { illuminant: "D65", deltaE00: 0.7 },
  ],
  maximumDeltaE00: 0.7,
  maximumIlluminant: "D65",
  thresholds: { warningDeltaE00: 1, riskDeltaE00: 2 },
  method: "PRECOMPUTED_MULTI_ILLUMINANT_DELTA_E00_GATE",
  verdict: "METAMERISM_QUALIFIED",
  limitations: [],
};

test("creates a deterministic complete spectral evidence pass", () => {
  const input = { targetReference, atlasFit, spectralScissor, structuralDrift, metamerism };
  const left = createSpectralIntelligenceSummary(input);
  const right = createSpectralIntelligenceSummary(input);
  assert.deepEqual(left, right);
  assert.equal(left.overallStatus, "SPECTRAL_EVIDENCE_PASS");
  assert.equal(left.completedDomains, 4);
  assert.deepEqual(left.findings.map((finding) => finding.status), ["PASS", "PASS", "PASS", "PASS"]);
});

test("marks missing module evidence as incomplete without inference", () => {
  const summary = createSpectralIntelligenceSummary({ targetReference, atlasFit });
  assert.equal(summary.overallStatus, "SPECTRAL_EVIDENCE_INCOMPLETE");
  assert.equal(summary.completedDomains, 1);
  assert.equal(summary.findings[1]?.status, "NOT_PERFORMED");
});

test("propagates warning and block states deterministically", () => {
  const warning = createSpectralIntelligenceSummary({
    targetReference,
    atlasFit,
    spectralScissor,
    structuralDrift: { ...structuralDrift, driftStatus: "WATCH", deltaDeltaLambdaNm: 7 },
    metamerism,
  });
  assert.equal(warning.overallStatus, "SPECTRAL_EVIDENCE_WARNING");

  const blocked = createSpectralIntelligenceSummary({
    targetReference,
    atlasFit: { ...atlasFit, status: "REFERENCE_UNLOCKED", nearestReference: "H240_L050_C030", targetRank: 2 },
    spectralScissor,
    structuralDrift,
    metamerism,
  });
  assert.equal(blocked.overallStatus, "SPECTRAL_EVIDENCE_BLOCK");
});

test("rejects evidence from another target reference", () => {
  assert.throws(
    () => createSpectralIntelligenceSummary({
      targetReference,
      atlasFit: { ...atlasFit, targetReference: "H120_L050_C030" },
    }),
    /target mismatch/,
  );
});

test("returns deeply frozen summary objects", () => {
  const summary = createSpectralIntelligenceSummary({ targetReference, atlasFit });
  assert.equal(Object.isFrozen(summary), true);
  assert.equal(Object.isFrozen(summary.findings), true);
  assert.equal(Object.isFrozen(summary.findings[0]), true);
});
