import assert from "node:assert/strict";
import test from "node:test";
import {
  createStructuralIntelligenceExplanation,
  verifyStructuralIntelligenceExplanation,
} from "./structural-intelligence-explanation";
import type { StructuralIntelligenceAssessment } from "./structural-intelligence";

function assessment(
  overallStatus: StructuralIntelligenceAssessment["overallStatus"] = "STRUCTURAL_REVIEW",
): StructuralIntelligenceAssessment {
  return {
    schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_V1",
    targetReference: "H000_L050_C000",
    method: "RULE_BASED_ATLAS_BOUND_STRUCTURAL_INTERPRETATION_V1",
    overallStatus,
    deltaSigmaNm: 1.2,
    deltaMu3Standardized: 0.4,
    activeWindowCount: 2,
    dominantWindowId: "W560_610",
    dominantWindowShare: 0.72,
    windowPattern: "OSCILLATORY",
    findings: [
      { sequence: 1, domain: "DELTA_LAMBDA", status: "PASS", evidenceStatus: "STABLE", explanation: "Balance stable." },
      { sequence: 2, domain: "DISPERSION", status: "WATCH", evidenceStatus: "DELTA_SIGMA_WATCH", explanation: "Dispersion changed." },
      { sequence: 3, domain: "SKEWNESS", status: "REVIEW", evidenceStatus: "DELTA_MU3_REVIEW", explanation: "Skewness changed." },
      { sequence: 4, domain: "WINDOW_STRUCTURE", status: "REVIEW", evidenceStatus: "OSCILLATORY", explanation: "Window structure oscillates." },
      { sequence: 5, domain: "METAMERISM", status: "NOT_PERFORMED", evidenceStatus: "NOT_PROVIDED", explanation: "Metamerism evidence was not provided." },
    ],
    completedDomains: 4,
    requiredDomains: 5,
    policy: {
      dispersionSigmaWatchNm: 1,
      dispersionSigmaReviewNm: 2,
      dispersionSigmaBlockNm: 4,
      skewDeltaWatch: 0.1,
      skewDeltaReview: 0.3,
      skewDeltaBlock: 0.6,
      activeWindowShareThreshold: 0.1,
      localizedDominantShareThreshold: 0.7,
      distributedWindowCountThreshold: 3,
      oscillatorySignChangeThreshold: 4,
    },
    claimBoundary: "No root-cause or production-release claim.",
    limitations: ["Thresholds are analytical parameters."],
  };
}

test("creates a deterministic integrity-bound explanation ordered by severity", () => {
  const left = createStructuralIntelligenceExplanation(assessment());
  const right = createStructuralIntelligenceExplanation(assessment());

  assert.deepEqual(left, right);
  assert.equal(left.sections[0].status, "REVIEW");
  assert.equal(left.sections[1].status, "REVIEW");
  assert.equal(left.sections.at(-1)?.status, "PASS");
  assert.match(left.summary, /4 of 5/);
  assert.equal(verifyStructuralIntelligenceExplanation(left), true);
});

test("provides distinct headlines for stable, incomplete and blocking outcomes", () => {
  assert.match(createStructuralIntelligenceExplanation(assessment("STRUCTURALLY_STABLE")).headline, /stable/);
  assert.match(createStructuralIntelligenceExplanation(assessment("STRUCTURAL_EVIDENCE_INCOMPLETE")).headline, /incomplete/);
  assert.match(createStructuralIntelligenceExplanation(assessment("STRUCTURAL_BLOCK")).headline, /blocking/);
});

test("detects tampering without inventing new evidence", () => {
  const explanation = createStructuralIntelligenceExplanation(assessment());
  const tampered = {
    ...explanation,
    headline: "Production approved.",
  };
  assert.equal(verifyStructuralIntelligenceExplanation(tampered), false);
  assert.equal(explanation.sections.some((section) => section.explanation.includes("Production approved")), false);
});

test("returns deeply frozen explanation objects", () => {
  const explanation = createStructuralIntelligenceExplanation(assessment());
  assert.equal(Object.isFrozen(explanation), true);
  assert.equal(Object.isFrozen(explanation.sections), true);
  assert.equal(Object.isFrozen(explanation.sections[0]), true);
  assert.equal(Object.isFrozen(explanation.integrity), true);
  assert.equal(Object.isFrozen(explanation.limitations), true);
});
