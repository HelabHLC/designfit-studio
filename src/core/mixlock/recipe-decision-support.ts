import type {
  RankedRecipeCandidate,
  RecipeCandidateRankingResult,
} from "./recipe-candidate-ranking";

export type RecipeDecisionAction =
  | "PRIORITIZE_FOR_CONTROLLED_REVIEW"
  | "PERFORM_TECHNICAL_REVIEW"
  | "COMPLETE_MISSING_EVIDENCE"
  | "RESOLVE_BLOCKING_EVIDENCE";

export type RecipeDecisionPortfolioStatus =
  | "REVIEW_CANDIDATE_AVAILABLE"
  | "TECHNICAL_REVIEW_REQUIRED"
  | "EVIDENCE_COMPLETION_REQUIRED"
  | "ALL_CANDIDATES_BLOCKED";

export interface RecipeDecisionSupportItem {
  readonly candidateId: string;
  readonly rank: number;
  readonly evidenceClass: RankedRecipeCandidate["evidenceClass"];
  readonly action: RecipeDecisionAction;
  readonly rationale: string;
}

export interface RecipeDecisionSupportResult {
  readonly schemaVersion: "ARBE_RECIPE_DECISION_SUPPORT_V1";
  readonly targetReference: string;
  readonly method: "DETERMINISTIC_RANKING_TO_ACTION_MAPPING_V1";
  readonly portfolioStatus: RecipeDecisionPortfolioStatus;
  readonly primaryCandidateId: string;
  readonly items: readonly RecipeDecisionSupportItem[];
  readonly nextAction: string;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function actionFor(candidate: RankedRecipeCandidate): RecipeDecisionAction {
  if (candidate.evidenceClass === "CLASS_A") return "PRIORITIZE_FOR_CONTROLLED_REVIEW";
  if (candidate.evidenceClass === "CLASS_B") return "PERFORM_TECHNICAL_REVIEW";
  if (candidate.evidenceClass === "CLASS_C") return "COMPLETE_MISSING_EVIDENCE";
  return "RESOLVE_BLOCKING_EVIDENCE";
}

function rationaleFor(candidate: RankedRecipeCandidate): string {
  if (candidate.evidenceClass === "CLASS_A") {
    return "Complete reviewable evidence is present; begin controlled review without implying recipe approval.";
  }
  if (candidate.evidenceClass === "CLASS_B") {
    return "Watch or review evidence is present; resolve technical findings before advancing the candidate.";
  }
  if (candidate.evidenceClass === "CLASS_C") {
    return "Mandatory evidence is incomplete; supply the missing evidence before analytical review.";
  }
  return "Blocking or invalid evidence is present; resolve the blocking condition before further qualification.";
}

function assertRanking(ranking: RecipeCandidateRankingResult): void {
  if (ranking.schemaVersion !== "ARBE_RECIPE_CANDIDATE_RANKING_V1") {
    throw new Error("Unsupported Recipe Candidate Ranking schema.");
  }
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(ranking.targetReference)) {
    throw new Error("Recipe decision target reference must match Hxxx_Lxxx_Cxxx.");
  }
  if (ranking.rankedCandidates.length < 2) {
    throw new Error("Recipe decision support requires at least two ranked candidates.");
  }
  ranking.rankedCandidates.forEach((candidate, index) => {
    if (candidate.rank !== index + 1) throw new Error("Recipe ranking must contain contiguous ranks starting at one.");
    if (candidate.targetReference !== ranking.targetReference) {
      throw new Error("All ranked candidates must share the decision target reference.");
    }
  });
}

export function createRecipeDecisionSupport(
  ranking: RecipeCandidateRankingResult,
): RecipeDecisionSupportResult {
  assertRanking(ranking);
  const top = ranking.rankedCandidates[0];
  const portfolioStatus: RecipeDecisionPortfolioStatus = top.evidenceClass === "CLASS_A"
    ? "REVIEW_CANDIDATE_AVAILABLE"
    : top.evidenceClass === "CLASS_B"
      ? "TECHNICAL_REVIEW_REQUIRED"
      : top.evidenceClass === "CLASS_C"
        ? "EVIDENCE_COMPLETION_REQUIRED"
        : "ALL_CANDIDATES_BLOCKED";

  const items = ranking.rankedCandidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    evidenceClass: candidate.evidenceClass,
    action: actionFor(candidate),
    rationale: rationaleFor(candidate),
  }));

  const nextAction = portfolioStatus === "REVIEW_CANDIDATE_AVAILABLE"
    ? `Begin controlled review with ${top.candidateId}; no recipe or production approval is implied.`
    : portfolioStatus === "TECHNICAL_REVIEW_REQUIRED"
      ? `Resolve technical review findings for ${top.candidateId} before advancing any candidate.`
      : portfolioStatus === "EVIDENCE_COMPLETION_REQUIRED"
        ? `Complete mandatory evidence for ${top.candidateId} before analytical candidate review.`
        : "Resolve blocking evidence before any candidate can advance.";

  return deepFreeze({
    schemaVersion: "ARBE_RECIPE_DECISION_SUPPORT_V1",
    targetReference: ranking.targetReference,
    method: "DETERMINISTIC_RANKING_TO_ACTION_MAPPING_V1",
    portfolioStatus,
    primaryCandidateId: top.candidateId,
    items,
    nextAction,
    claimBoundary: "Recipe Decision Support converts an existing deterministic ranking into bounded review actions. It does not identify a best recipe, approve a formulation, certify equivalence or grant production release.",
    limitations: [
      ...ranking.limitations,
      "Decision actions are workflow guidance and are not scientific conclusions beyond the supplied ranking evidence.",
      "The primary candidate is first in review order only and is not declared optimal or production-ready.",
    ],
  });
}
