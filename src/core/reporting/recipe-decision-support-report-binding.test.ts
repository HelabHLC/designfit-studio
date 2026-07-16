import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeDecisionSupport } from "../mixlock/recipe-decision-support";
import type { RecipeCandidateRankingResult } from "../mixlock/recipe-candidate-ranking";
import { createRecipeDecisionSupportReportBinding, verifyRecipeDecisionSupportReportBinding } from "./recipe-decision-support-report-binding";

function ranking(): RecipeCandidateRankingResult {
  return {
    schemaVersion: "ARBE_RECIPE_CANDIDATE_RANKING_V1",
    targetReference: "H250_L050_C030",
    method: "DETERMINISTIC_EVIDENCE_CLASS_AND_LEXICOGRAPHIC_ORDER_V1",
    rankedCandidates: ["A", "B"].map((id, index) => ({
      rank: index + 1, candidateId: id, targetReference: "H250_L050_C030",
      evidenceClass: index === 0 ? "CLASS_A" : "CLASS_B",
      assessmentOutcome: index === 0 ? "RECIPE_CANDIDATE_REVIEWABLE" : "RECIPE_TECHNICAL_REVIEW_REQUIRED",
      atlasFitStatus: "REFERENCE_LOCKED", structuralStatus: index === 0 ? "STRUCTURALLY_STABLE" : "STRUCTURAL_WATCH",
      metamerismStatus: "REFERENCE_LOCKED_METAMERISM_LOW", spectralRmse: 0.01 + index,
      adverseFindingCount: index, missingMandatoryCount: 0, reasons: ["evidence"],
    })),
    claimBoundary: "ranking boundary", limitations: ["ranking limitation"],
  };
}

test("creates deterministic verifiable binding", () => {
  const support = createRecipeDecisionSupport(ranking());
  const left = createRecipeDecisionSupportReportBinding(support);
  const right = createRecipeDecisionSupportReportBinding(support);
  assert.deepEqual(left, right);
  assert.equal(verifyRecipeDecisionSupportReportBinding(left), true);
  assert.equal(left.payload.primaryCandidateId, "A");
});

test("detects tampering and freezes objects", () => {
  const report = createRecipeDecisionSupportReportBinding(createRecipeDecisionSupport(ranking()));
  const tampered = { ...report, payload: { ...report.payload, candidateCount: 9 } };
  assert.equal(verifyRecipeDecisionSupportReportBinding(tampered), false);
  assert.equal(Object.isFrozen(report), true);
  assert.equal(Object.isFrozen(report.payload.decisionSupport.items), true);
});
