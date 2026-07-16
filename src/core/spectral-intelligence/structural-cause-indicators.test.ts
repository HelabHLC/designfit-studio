import assert from "node:assert/strict";
import test from "node:test";
import type { StructuralDriftEvidence } from "../scissor";
import type { StructuralIntelligenceAssessment } from "./structural-intelligence";
import { createStructuralCauseIndicators } from "./structural-cause-indicators";
import type { SpectralWindowStructure } from "./window-structure";

const reference = "H000_L050_C000";

function assessment(
  overrides: Partial<StructuralIntelligenceAssessment> = {},
): StructuralIntelligenceAssessment {
  return {
    schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_V1",
    targetReference: reference,
    method: "RULE_BASED_ATLAS_BOUND_STRUCTURAL_INTERPRETATION_V1",
    overallStatus: "STRUCTURALLY_STABLE",
    deltaSigmaNm: 0,
    deltaMu3Standardized: 0,
    activeWindowCount: 0,
    dominantWindowId: "W380_430",
    dominantWindowShare: 0,
    windowPattern: "NO_DIFFERENCE",
    findings: [
      { sequence: 1, domain: "DELTA_LAMBDA", status: "PASS", evidenceStatus: "STABLE", explanation: "Balance stable." },
      { sequence: 2, domain: "DISPERSION", status: "PASS", evidenceStatus: "DELTA_SIGMA_PASS", explanation: "Dispersion stable." },
      { sequence: 3, domain: "SKEWNESS", status: "PASS", evidenceStatus: "DELTA_MU3_PASS", explanation: "Skewness stable." },
      { sequence: 4, domain: "WINDOW_STRUCTURE", status: "PASS", evidenceStatus: "NO_DIFFERENCE", explanation: "No window difference." },
      { sequence: 5, domain: "METAMERISM", status: "PASS", evidenceStatus: "REFERENCE_LOCKED_METAMERISM_LOW", explanation: "Metamerism low." },
    ],
    completedDomains: 5,
    requiredDomains: 5,
    policy: {
      dispersionSigmaWatchNm: 2,
      dispersionSigmaReviewNm: 5,
      dispersionSigmaBlockNm: 10,
      skewDeltaWatch: 0.1,
      skewDeltaReview: 0.3,
      skewDeltaBlock: 0.6,
      activeWindowShareThreshold: 0.1,
      localizedDominantShareThreshold: 0.7,
      distributedWindowCountThreshold: 3,
      oscillatorySignChangeThreshold: 4,
    },
    claimBoundary: "No root-cause claim.",
    limitations: ["Analytical only."],
    ...overrides,
  };
}

function windows(
  overrides: Partial<SpectralWindowStructure> = {},
): SpectralWindowStructure {
  const baseWindows: SpectralWindowStructure["windows"] = [
    { sequence: 1, windowId: "W380_430", startNm: 380, endNm: 430, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 380, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
    { sequence: 2, windowId: "W440_490", startNm: 440, endNm: 490, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 440, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
    { sequence: 3, windowId: "W500_550", startNm: 500, endNm: 550, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 500, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
    { sequence: 4, windowId: "W560_610", startNm: 560, endNm: 610, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 560, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
    { sequence: 5, windowId: "W620_670", startNm: 620, endNm: 670, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 620, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
    { sequence: 6, windowId: "W680_730", startNm: 680, endNm: 730, bandCount: 6, signedMeanDifference: 0, meanAbsoluteDifference: 0, rmse: 0, integratedAbsoluteDifferenceNm: 0, maximumAbsoluteDifference: 0, peakWavelengthNm: 680, direction: "NO_DIFFERENCE", signChanges: 0, absoluteDifferenceShare: 0 },
  ];
  return {
    schemaVersion: "ARBE_SPECTRAL_WINDOW_STRUCTURE_V1",
    targetReference: reference,
    method: "FIXED_6_WINDOW_REFLECTANCE_DIFFERENCE_380_730_10NM_V1",
    status: "NO_DIFFERENCE",
    windows: baseWindows,
    dominantWindowId: "W380_430",
    totalIntegratedAbsoluteDifferenceNm: 0,
    globalRmse: 0,
    globalSignChanges: 0,
    claimBoundary: "Local evidence only.",
    limitations: ["Not root cause."],
    ...overrides,
  };
}

function drift(deltaDeltaLambdaNm = 0, status: StructuralDriftEvidence["driftStatus"] = "STABLE"): StructuralDriftEvidence {
  return {
    lambdaV2Nm: 555,
    lambdaEeNm: 555,
    deltaLambdaNm: 0,
    masterDeltaLambdaNm: 0,
    deltaDeltaLambdaNm,
    driftStatus: status,
    method: "ARBE_STRUCTURAL_DRIFT_V04",
    lambdaV2Method: "Brent",
  };
}

test("records no cause indicator for structurally stable evidence", () => {
  const left = createStructuralCauseIndicators({ assessment: assessment(), windowStructure: windows(), structuralDrift: drift() });
  const right = createStructuralCauseIndicators({ assessment: assessment(), windowStructure: windows(), structuralDrift: drift() });
  assert.deepEqual(left, right);
  assert.equal(left.status, "NO_INDICATOR");
  assert.equal(left.indicators[0].code, "NO_STRUCTURAL_CAUSE_INDICATOR");
  assert.equal(left.investigationCandidates.length, 0);
});

test("maps localized longwave evidence to bounded investigation candidates", () => {
  const localizedWindow = {
    ...windows().windows[3],
    integratedAbsoluteDifferenceNm: 6,
    absoluteDifferenceShare: 0.9,
    direction: "CANDIDATE_ABOVE" as const,
  };
  const result = createStructuralCauseIndicators({
    assessment: assessment({
      overallStatus: "STRUCTURAL_REVIEW",
      deltaMu3Standardized: 0.5,
      activeWindowCount: 1,
      dominantWindowId: "W560_610",
      dominantWindowShare: 0.9,
      windowPattern: "LOCALIZED",
      findings: assessment().findings.map((item) =>
        item.domain === "DELTA_LAMBDA" ? { ...item, status: "REVIEW", evidenceStatus: "REVIEW", explanation: "Balance shifted." }
          : item.domain === "SKEWNESS" ? { ...item, status: "REVIEW", evidenceStatus: "DELTA_MU3_REVIEW", explanation: "Skewness shifted." }
            : item.domain === "WINDOW_STRUCTURE" ? { ...item, status: "PASS", evidenceStatus: "LOCALIZED", explanation: "Localized difference." }
              : item,
      ),
    }),
    windowStructure: windows({
      status: "DIFFERENCE_RECORDED",
      windows: windows().windows.map((item) => item.windowId === "W560_610" ? localizedWindow : item),
      dominantWindowId: "W560_610",
      totalIntegratedAbsoluteDifferenceNm: 6,
    }),
    structuralDrift: drift(12, "REVIEW"),
  });

  assert.equal(result.status, "INDICATORS_RECORDED");
  assert.ok(result.indicators.some((item) => item.code === "LONGWAVE_BALANCE_SHIFT"));
  assert.ok(result.indicators.some((item) => item.code === "LONGWAVE_ASYMMETRIC_MIGRATION"));
  assert.ok(result.indicators.some((item) => item.code === "LOCALIZED_REFLECTANCE_ELEVATION"));
  assert.ok(result.investigationCandidates.some((item) => item.domain === "PIGMENT_OR_FORMULATION"));
  assert.ok(result.investigationCandidates.every((item) => item.boundary === "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE"));
});

test("maps oscillatory and metamerism evidence without assigning root cause", () => {
  const result = createStructuralCauseIndicators({
    assessment: assessment({
      overallStatus: "STRUCTURAL_BLOCK",
      windowPattern: "OSCILLATORY",
      findings: assessment().findings.map((item) =>
        item.domain === "WINDOW_STRUCTURE" ? { ...item, status: "REVIEW", evidenceStatus: "OSCILLATORY", explanation: "Oscillatory difference." }
          : item.domain === "METAMERISM" ? { ...item, status: "BLOCK", evidenceStatus: "REFERENCE_LOCKED_METAMERISM_RISK", explanation: "Illuminant risk." }
            : item,
      ),
    }),
    windowStructure: windows({ status: "DIFFERENCE_RECORDED", globalSignChanges: 5 }),
    structuralDrift: drift(),
  });

  assert.ok(result.indicators.some((item) => item.code === "OSCILLATORY_SPECTRAL_STRUCTURE"));
  assert.ok(result.indicators.some((item) => item.code === "MULTI_ILLUMINANT_INSTABILITY"));
  assert.ok(result.investigationCandidates.some((item) => item.domain === "MEASUREMENT_SYSTEM"));
  assert.ok(result.investigationCandidates.some((item) => item.domain === "ILLUMINANT_METAMERISM"));
  assert.match(result.claimBoundary, /not root-cause findings/);
});

test("rejects mismatched atlas targets and returns deeply frozen results", () => {
  assert.throws(
    () => createStructuralCauseIndicators({
      assessment: assessment(),
      windowStructure: windows({ targetReference: "H010_L050_C000" }),
      structuralDrift: drift(),
    }),
    /target mismatch/,
  );
  const result = createStructuralCauseIndicators({ assessment: assessment(), windowStructure: windows(), structuralDrift: drift() });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.indicators), true);
  assert.equal(Object.isFrozen(result.indicators[0]), true);
  assert.equal(Object.isFrozen(result.investigationCandidates), true);
  assert.equal(Object.isFrozen(result.limitations), true);
});
