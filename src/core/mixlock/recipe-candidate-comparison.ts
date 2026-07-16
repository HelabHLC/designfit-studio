import type { RankedRecipeCandidate, RecipeCandidateEvidenceClass, RecipeCandidateRankingResult } from "./recipe-candidate-ranking";

export type RecipeCandidateComparisonOutcome = "LEFT_PRIORITIZED_FOR_REVIEW" | "RIGHT_PRIORITIZED_FOR_REVIEW" | "EVIDENCE_ORDER_TIE";
export type RecipeCandidateComparisonCriterion = "EVIDENCE_CLASS" | "MISSING_MANDATORY_EVIDENCE" | "ADVERSE_FINDINGS" | "SPECTRAL_RMSE" | "CANDIDATE_ID_TIE_BREAKER" | "NO_DIFFERENCE";

export interface RecipeCandidateComparisonResult {
  readonly schemaVersion: "ARBE_RECIPE_CANDIDATE_COMPARISON_V1";
  readonly targetReference: string;
  readonly method: "PAIRWISE_REPLAY_OF_RECIPE_RANKING_ORDER_V1";
  readonly leftCandidate: RankedRecipeCandidate;
  readonly rightCandidate: RankedRecipeCandidate;
  readonly outcome: RecipeCandidateComparisonOutcome;
  readonly prioritizedCandidateId?: string;
  readonly decisiveCriterion: RecipeCandidateComparisonCriterion;
  readonly evidenceClassComparison: { readonly left: RecipeCandidateEvidenceClass; readonly right: RecipeCandidateEvidenceClass };
  readonly differences: readonly string[];
  readonly explanation: string;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

const CLASS_ORDER: Readonly<Record<RecipeCandidateEvidenceClass, number>> = Object.freeze({ CLASS_A: 0, CLASS_B: 1, CLASS_C: 2, CLASS_D: 3 });

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function assertRanking(ranking: RecipeCandidateRankingResult): void {
  if (ranking.schemaVersion !== "ARBE_RECIPE_CANDIDATE_RANKING_V1") throw new Error("Unsupported Recipe Candidate Ranking schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(ranking.targetReference)) throw new Error("Comparison target must match Hxxx_Lxxx_Cxxx.");
  if (ranking.rankedCandidates.length < 2) throw new Error("Comparison requires a ranking with at least two candidates.");
  ranking.rankedCandidates.forEach((candidate, index) => {
    if (candidate.rank !== index + 1) throw new Error("Recipe candidate ranking order is internally inconsistent.");
    if (candidate.targetReference !== ranking.targetReference) throw new Error("Ranked candidate target mismatch.");
  });
}

function order(left: RankedRecipeCandidate, right: RankedRecipeCandidate): { value: number; criterion: RecipeCandidateComparisonCriterion } {
  const values: readonly [number, RecipeCandidateComparisonCriterion][] = [
    [CLASS_ORDER[left.evidenceClass] - CLASS_ORDER[right.evidenceClass], "EVIDENCE_CLASS"],
    [left.missingMandatoryCount - right.missingMandatoryCount, "MISSING_MANDATORY_EVIDENCE"],
    [left.adverseFindingCount - right.adverseFindingCount, "ADVERSE_FINDINGS"],
    [(left.spectralRmse ?? Number.POSITIVE_INFINITY) - (right.spectralRmse ?? Number.POSITIVE_INFINITY), "SPECTRAL_RMSE"],
    [left.candidateId.localeCompare(right.candidateId), "CANDIDATE_ID_TIE_BREAKER"],
  ];
  const decisive = values.find(([value]) => value !== 0);
  return decisive ? { value: decisive[0], criterion: decisive[1] } : { value: 0, criterion: "NO_DIFFERENCE" };
}

function describeDifferences(left: RankedRecipeCandidate, right: RankedRecipeCandidate): string[] {
  const result: string[] = [];
  if (left.evidenceClass !== right.evidenceClass) result.push(`Evidence class: ${left.candidateId}=${left.evidenceClass}; ${right.candidateId}=${right.evidenceClass}.`);
  if (left.missingMandatoryCount !== right.missingMandatoryCount) result.push(`Missing mandatory evidence: ${left.candidateId}=${left.missingMandatoryCount}; ${right.candidateId}=${right.missingMandatoryCount}.`);
  if (left.adverseFindingCount !== right.adverseFindingCount) result.push(`Adverse findings: ${left.candidateId}=${left.adverseFindingCount}; ${right.candidateId}=${right.adverseFindingCount}.`);
  if (left.spectralRmse !== right.spectralRmse) result.push(`Spectral RMSE: ${left.candidateId}=${left.spectralRmse ?? "NOT_SUPPLIED"}; ${right.candidateId}=${right.spectralRmse ?? "NOT_SUPPLIED"}.`);
  if (left.structuralStatus !== right.structuralStatus) result.push(`Structural status: ${left.structuralStatus} versus ${right.structuralStatus}.`);
  if (left.metamerismStatus !== right.metamerismStatus) result.push(`Metamerism status: ${left.metamerismStatus} versus ${right.metamerismStatus}.`);
  return result.length ? result : ["No evidence-order difference was found."];
}

export function compareRecipeCandidates(ranking: RecipeCandidateRankingResult, leftCandidateId: string, rightCandidateId: string): RecipeCandidateComparisonResult {
  assertRanking(ranking);
  const leftId = leftCandidateId.trim();
  const rightId = rightCandidateId.trim();
  if (!leftId || !rightId) throw new Error("Comparison requires two non-empty candidate IDs.");
  if (leftId === rightId) throw new Error("Comparison requires two different candidates.");
  const left = ranking.rankedCandidates.find((candidate) => candidate.candidateId === leftId);
  const right = ranking.rankedCandidates.find((candidate) => candidate.candidateId === rightId);
  if (!left || !right) throw new Error("Both candidates must be present in the supplied ranking.");

  const comparison = order(left, right);
  const outcome = comparison.value < 0 ? "LEFT_PRIORITIZED_FOR_REVIEW" : comparison.value > 0 ? "RIGHT_PRIORITIZED_FOR_REVIEW" : "EVIDENCE_ORDER_TIE";
  const prioritizedCandidateId = comparison.value < 0 ? left.candidateId : comparison.value > 0 ? right.candidateId : undefined;
  const explanation = prioritizedCandidateId
    ? `${prioritizedCandidateId} is prioritized for review by ${comparison.criterion}; this is not a best-recipe determination.`
    : "The candidates are tied under the deterministic evidence-order criteria.";

  return deepFreeze({
    schemaVersion: "ARBE_RECIPE_CANDIDATE_COMPARISON_V1",
    targetReference: ranking.targetReference,
    method: "PAIRWISE_REPLAY_OF_RECIPE_RANKING_ORDER_V1",
    leftCandidate: left,
    rightCandidate: right,
    outcome,
    prioritizedCandidateId,
    decisiveCriterion: comparison.criterion,
    evidenceClassComparison: { left: left.evidenceClass, right: right.evidenceClass },
    differences: describeDifferences(left, right),
    explanation,
    claimBoundary: "This comparison explains review priority under the existing deterministic ranking. It does not identify a best recipe, prove a global optimum, certify equivalence, approve a recipe or grant production release.",
    limitations: [
      "The comparison inherits the evidence limitations of Recipe Candidate Ranking v1.",
      "Review priority is not a production recommendation or release.",
      "Spectral RMSE cannot override a worse evidence class or blocking evidence.",
      "Candidate components remain candidate-space data and are not ARBE identities.",
    ],
  });
}
