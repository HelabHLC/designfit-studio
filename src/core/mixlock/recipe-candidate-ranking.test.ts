import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeEvidenceAssessmentReportBinding } from "../reporting";
import {
  assessRecipeEvidence,
  rankRecipeCandidates,
  type RecipeCandidateRankingInput,
  type RecipeEvidenceItem,
  type RecipeEvidenceStatus,
  type RecipeIntelligenceRequirementId,
} from "./index";

const reference = "H250_L050_C030";
const requirementIds: readonly RecipeIntelligenceRequirementId[] = [
  "ATLAS_REFERENCE_BOUND",
  "CANDIDATE_RECIPE_AVAILABLE",
  "CANDIDATE_SPECTRUM_AVAILABLE",
  "ATLAS_FIT_EVIDENCE_AVAILABLE",
  "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED",
  "METAMERISM_EVIDENCE_AVAILABLE",
  "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED",
];

function evidence(overrides: Partial<Record<RecipeIntelligenceRequirementId, RecipeEvidenceStatus>> = {}): RecipeEvidenceItem[] {
  return requirementIds.map((requirementId) => ({
    requirementId,
    status: overrides[requirementId] ?? "PRESENT",
    evidence: `${requirementId} evidence.`,
  }));
}

function candidate(
  candidateId: string,
  overrides: Partial<RecipeCandidateRankingInput> = {},
  evidenceOverrides: Partial<Record<RecipeIntelligenceRequirementId, RecipeEvidenceStatus>> = {},
): RecipeCandidateRankingInput {
  const assessment = assessRecipeEvidence(reference, evidence(evidenceOverrides));
  return {
    candidateId,
    assessmentReport: createRecipeEvidenceAssessmentReportBinding(assessment),
    atlasFitStatus: "REFERENCE_LOCKED",
    spectralRmse: 0.02,
    structuralStatus: "STRUCTURALLY_STABLE",
    metamerismStatus: "REFERENCE_LOCKED_METAMERISM_LOW",
    ...overrides,
  };
}

test("ranks candidates by evidence class before spectral RMSE", () => {
  const result = rankRecipeCandidates([
    candidate("review", { spectralRmse: 0.001, structuralStatus: "STRUCTURAL_REVIEW" }),
    candidate("stable", { spectralRmse: 0.02 }),
    candidate("blocked", { spectralRmse: 0, structuralStatus: "STRUCTURAL_BLOCK" }),
    candidate("incomplete", {}, { CANDIDATE_SPECTRUM_AVAILABLE: "MISSING" }),
  ]);

  assert.deepEqual(
    result.rankedCandidates.map((item) => [item.candidateId, item.evidenceClass, item.rank]),
    [
      ["stable", "CLASS_A", 1],
      ["review", "CLASS_B", 2],
      ["incomplete", "CLASS_C", 3],
      ["blocked", "CLASS_D", 4],
    ],
  );
  assert.match(result.claimBoundary, /does not identify a best recipe/);
});

test("uses RMSE and candidateId only as deterministic within-class tie-breakers", () => {
  const result = rankRecipeCandidates([
    candidate("C", { spectralRmse: undefined }),
    candidate("B", { spectralRmse: 0.03 }),
    candidate("A", { spectralRmse: 0.03 }),
    candidate("D", { spectralRmse: 0.01 }),
  ]);
  assert.deepEqual(result.rankedCandidates.map((item) => item.candidateId), ["D", "A", "B", "C"]);
});

test("rejects mixed references, duplicate IDs and invalid reports", () => {
  const otherAssessment = assessRecipeEvidence("H120_L060_C040", evidence());
  assert.throws(
    () => rankRecipeCandidates([
      candidate("one"),
      candidate("two", { assessmentReport: createRecipeEvidenceAssessmentReportBinding(otherAssessment) }),
    ]),
    /share target reference/,
  );
  assert.throws(() => rankRecipeCandidates([candidate("same"), candidate("same")]), /Duplicate/);

  const valid = candidate("valid");
  const invalid = {
    ...candidate("invalid"),
    assessmentReport: {
      ...valid.assessmentReport,
      payload: { ...valid.assessmentReport.payload, findingCount: 99 },
    },
  } as RecipeCandidateRankingInput;
  assert.throws(() => rankRecipeCandidates([valid, invalid]), /integrity failed/);
});

test("requires at least two candidates and returns deeply frozen results", () => {
  assert.throws(() => rankRecipeCandidates([candidate("only")]), /at least two/);
  const result = rankRecipeCandidates([candidate("A"), candidate("B")]);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.rankedCandidates), true);
  assert.equal(Object.isFrozen(result.rankedCandidates[0]), true);
  assert.equal(Object.isFrozen(result.rankedCandidates[0].reasons), true);
});
