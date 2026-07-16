import assert from "node:assert/strict";
import test from "node:test";
import { compareRecipeCandidates } from "./recipe-candidate-comparison";
import type { RankedRecipeCandidate, RecipeCandidateRankingResult } from "./recipe-candidate-ranking";

const reference = "H250_L050_C030";

function candidate(overrides: Partial<RankedRecipeCandidate> & Pick<RankedRecipeCandidate, "candidateId" | "rank">): RankedRecipeCandidate {
  return {
    targetReference: reference,
    evidenceClass: "CLASS_A",
    assessmentOutcome: "RECIPE_CANDIDATE_REVIEWABLE",
    atlasFitStatus: "REFERENCE_LOCKED",
    structuralStatus: "STRUCTURALLY_STABLE",
    metamerismStatus: "REFERENCE_LOCKED_METAMERISM_LOW",
    spectralRmse: 0.01,
    adverseFindingCount: 0,
    missingMandatoryCount: 0,
    reasons: ["test evidence"],
    ...overrides,
  };
}

function ranking(candidates: readonly RankedRecipeCandidate[]): RecipeCandidateRankingResult {
  return {
    schemaVersion: "ARBE_RECIPE_CANDIDATE_RANKING_V1",
    targetReference: reference,
    method: "DETERMINISTIC_EVIDENCE_CLASS_AND_LEXICOGRAPHIC_ORDER_V1",
    rankedCandidates: candidates,
    claimBoundary: "test boundary",
    limitations: ["test limitation"],
  };
}

test("prioritizes evidence class before spectral RMSE", () => {
  const result = compareRecipeCandidates(
    ranking([
      candidate({ candidateId: "stable", rank: 1, spectralRmse: 0.02 }),
      candidate({ candidateId: "review", rank: 2, evidenceClass: "CLASS_B", spectralRmse: 0.001, adverseFindingCount: 1 }),
    ]),
    "stable",
    "review",
  );
  assert.equal(result.outcome, "LEFT_PRIORITIZED_FOR_REVIEW");
  assert.equal(result.decisiveCriterion, "EVIDENCE_CLASS");
  assert.equal(result.prioritizedCandidateId, "stable");
  assert.match(result.claimBoundary, /does not identify a best recipe/);
});

test("uses spectral RMSE only after evidence criteria are equal", () => {
  const result = compareRecipeCandidates(
    ranking([
      candidate({ candidateId: "lower-rmse", rank: 1, spectralRmse: 0.01 }),
      candidate({ candidateId: "higher-rmse", rank: 2, spectralRmse: 0.02 }),
    ]),
    "higher-rmse",
    "lower-rmse",
  );
  assert.equal(result.outcome, "RIGHT_PRIORITIZED_FOR_REVIEW");
  assert.equal(result.decisiveCriterion, "SPECTRAL_RMSE");
  assert.equal(result.prioritizedCandidateId, "lower-rmse");
});

test("is deterministic and deeply frozen", () => {
  const source = ranking([
    candidate({ candidateId: "a", rank: 1 }),
    candidate({ candidateId: "b", rank: 2 }),
  ]);
  const left = compareRecipeCandidates(source, "a", "b");
  const right = compareRecipeCandidates(source, "a", "b");
  assert.deepEqual(left, right);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.differences), true);
  assert.equal(Object.isFrozen(left.leftCandidate), true);
});

test("rejects malformed rankings and invalid selections", () => {
  const source = ranking([
    candidate({ candidateId: "a", rank: 1 }),
    candidate({ candidateId: "b", rank: 2 }),
  ]);
  assert.throws(() => compareRecipeCandidates(source, "a", "a"), /different candidates/);
  assert.throws(() => compareRecipeCandidates(source, "a", "missing"), /present/);
  assert.throws(
    () => compareRecipeCandidates({ ...source, targetReference: "#336699" }, "a", "b"),
    /Hxxx_Lxxx_Cxxx/,
  );
  assert.throws(
    () => compareRecipeCandidates({ ...source, rankedCandidates: [candidate({ candidateId: "a", rank: 2 }), candidate({ candidateId: "b", rank: 1 })] }, "a", "b"),
    /internally inconsistent/,
  );
});
