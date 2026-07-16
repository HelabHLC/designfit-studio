import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeDecisionSupport } from "./recipe-decision-support";
import type { RecipeCandidateRankingResult } from "./recipe-candidate-ranking";

function ranking(classes: readonly ("CLASS_A" | "CLASS_B" | "CLASS_C" | "CLASS_D")[]): RecipeCandidateRankingResult {
  return {
    schemaVersion: "ARBE_RECIPE_CANDIDATE_RANKING_V1",
    targetReference: "H250_L050_C030",
    method: "DETERMINISTIC_EVIDENCE_CLASS_AND_LEXICOGRAPHIC_ORDER_V1",
    rankedCandidates: classes.map((evidenceClass, index) => ({
      rank: index + 1,
      candidateId: `candidate-${index + 1}`,
      targetReference: "H250_L050_C030",
      evidenceClass,
      assessmentOutcome: evidenceClass === "CLASS_A"
        ? "RECIPE_CANDIDATE_REVIEWABLE"
        : evidenceClass === "CLASS_B"
          ? "RECIPE_TECHNICAL_REVIEW_REQUIRED"
          : evidenceClass === "CLASS_C"
            ? "RECIPE_EVIDENCE_INCOMPLETE"
            : "RECIPE_BLOCKED_BY_EVIDENCE",
      atlasFitStatus: evidenceClass === "CLASS_D" ? "REFERENCE_UNLOCKED" : "REFERENCE_LOCKED",
      structuralStatus: evidenceClass === "CLASS_A" ? "STRUCTURALLY_STABLE" : "STRUCTURAL_WATCH",
      metamerismStatus: evidenceClass === "CLASS_D" ? "METAMERISM_INVALID" : "REFERENCE_LOCKED_METAMERISM_LOW",
      spectralRmse: 0.01 + index * 0.01,
      adverseFindingCount: evidenceClass === "CLASS_A" ? 0 : 1,
      missingMandatoryCount: evidenceClass === "CLASS_C" ? 1 : 0,
      reasons: [`Evidence class: ${evidenceClass}.`],
    })),
    claimBoundary: "Ranking boundary.",
    limitations: ["Ranking limitation."],
  };
}

test("maps a class A leader to controlled review", () => {
  const left = createRecipeDecisionSupport(ranking(["CLASS_A", "CLASS_B"]));
  const right = createRecipeDecisionSupport(ranking(["CLASS_A", "CLASS_B"]));
  assert.deepEqual(left, right);
  assert.equal(left.portfolioStatus, "REVIEW_CANDIDATE_AVAILABLE");
  assert.equal(left.items[0].action, "PRIORITIZE_FOR_CONTROLLED_REVIEW");
  assert.match(left.claimBoundary, /does not identify a best recipe/);
});

test("preserves review, missing and blocking action boundaries", () => {
  assert.equal(createRecipeDecisionSupport(ranking(["CLASS_B", "CLASS_C"])).portfolioStatus, "TECHNICAL_REVIEW_REQUIRED");
  assert.equal(createRecipeDecisionSupport(ranking(["CLASS_C", "CLASS_D"])).portfolioStatus, "EVIDENCE_COMPLETION_REQUIRED");
  assert.equal(createRecipeDecisionSupport(ranking(["CLASS_D", "CLASS_D"])).portfolioStatus, "ALL_CANDIDATES_BLOCKED");
});

test("rejects malformed rankings", () => {
  const malformed = ranking(["CLASS_A", "CLASS_B"]);
  assert.throws(
    () => createRecipeDecisionSupport({ ...malformed, targetReference: "#336699" }),
    /Hxxx_Lxxx_Cxxx/,
  );
  assert.throws(
    () => createRecipeDecisionSupport({ ...malformed, rankedCandidates: malformed.rankedCandidates.slice(0, 1) }),
    /at least two/,
  );
});

test("returns deeply frozen decision support objects", () => {
  const result = createRecipeDecisionSupport(ranking(["CLASS_A", "CLASS_B"]));
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.items), true);
  assert.equal(Object.isFrozen(result.items[0]), true);
  assert.equal(Object.isFrozen(result.limitations), true);
});
