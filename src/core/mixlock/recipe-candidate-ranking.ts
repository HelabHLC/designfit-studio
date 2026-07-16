import {
  verifyRecipeEvidenceAssessmentReportBinding,
  type RecipeEvidenceAssessmentReportBinding,
} from "../reporting/recipe-evidence-assessment-report-binding";

export type RecipeCandidateEvidenceClass = "CLASS_A" | "CLASS_B" | "CLASS_C" | "CLASS_D";

export interface RecipeCandidateRankingInput {
  readonly candidateId: string;
  readonly assessmentReport: RecipeEvidenceAssessmentReportBinding;
  readonly atlasFitStatus: "REFERENCE_LOCKED" | "REFERENCE_UNLOCKED" | "TARGET_REFERENCE_NOT_FOUND";
  readonly spectralRmse?: number;
  readonly structuralStatus:
    | "STRUCTURALLY_STABLE"
    | "STRUCTURAL_WATCH"
    | "STRUCTURAL_REVIEW"
    | "STRUCTURAL_BLOCK"
    | "STRUCTURAL_EVIDENCE_INCOMPLETE";
  readonly metamerismStatus:
    | "REFERENCE_LOCKED_METAMERISM_LOW"
    | "REFERENCE_LOCKED_METAMERISM_WARNING"
    | "REFERENCE_LOCKED_METAMERISM_RISK"
    | "METAMERISM_INVALID";
}

export interface RankedRecipeCandidate {
  readonly rank: number;
  readonly candidateId: string;
  readonly targetReference: string;
  readonly evidenceClass: RecipeCandidateEvidenceClass;
  readonly assessmentOutcome: RecipeEvidenceAssessmentReportBinding["payload"]["outcomeStatus"];
  readonly atlasFitStatus: RecipeCandidateRankingInput["atlasFitStatus"];
  readonly structuralStatus: RecipeCandidateRankingInput["structuralStatus"];
  readonly metamerismStatus: RecipeCandidateRankingInput["metamerismStatus"];
  readonly spectralRmse?: number;
  readonly adverseFindingCount: number;
  readonly missingMandatoryCount: number;
  readonly reasons: readonly string[];
}

export interface RecipeCandidateRankingResult {
  readonly schemaVersion: "ARBE_RECIPE_CANDIDATE_RANKING_V1";
  readonly targetReference: string;
  readonly method: "DETERMINISTIC_EVIDENCE_CLASS_AND_LEXICOGRAPHIC_ORDER_V1";
  readonly rankedCandidates: readonly RankedRecipeCandidate[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

const CLASS_ORDER: Readonly<Record<RecipeCandidateEvidenceClass, number>> = Object.freeze({
  CLASS_A: 0,
  CLASS_B: 1,
  CLASS_C: 2,
  CLASS_D: 3,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function evidenceClass(input: RecipeCandidateRankingInput): RecipeCandidateEvidenceClass {
  const outcome = input.assessmentReport.payload.outcomeStatus;
  if (
    outcome === "RECIPE_BLOCKED_BY_EVIDENCE" ||
    input.atlasFitStatus === "TARGET_REFERENCE_NOT_FOUND" ||
    input.structuralStatus === "STRUCTURAL_BLOCK" ||
    input.metamerismStatus === "METAMERISM_INVALID"
  ) return "CLASS_D";
  if (
    outcome === "RECIPE_EVIDENCE_INCOMPLETE" ||
    input.structuralStatus === "STRUCTURAL_EVIDENCE_INCOMPLETE"
  ) return "CLASS_C";
  if (
    outcome === "RECIPE_TECHNICAL_REVIEW_REQUIRED" ||
    input.atlasFitStatus === "REFERENCE_UNLOCKED" ||
    input.structuralStatus === "STRUCTURAL_WATCH" ||
    input.structuralStatus === "STRUCTURAL_REVIEW" ||
    input.metamerismStatus === "REFERENCE_LOCKED_METAMERISM_WARNING" ||
    input.metamerismStatus === "REFERENCE_LOCKED_METAMERISM_RISK"
  ) return "CLASS_B";
  return "CLASS_A";
}

function reasons(input: RecipeCandidateRankingInput, classification: RecipeCandidateEvidenceClass): string[] {
  const result = [
    `Recipe evidence outcome: ${input.assessmentReport.payload.outcomeStatus}.`,
    `AtlasFit status: ${input.atlasFitStatus}.`,
    `Structural status: ${input.structuralStatus}.`,
    `Metamerism status: ${input.metamerismStatus}.`,
    `Evidence class: ${classification}.`,
  ];
  if (input.spectralRmse !== undefined) result.push(`Spectral RMSE supplied for within-class ordering: ${input.spectralRmse}.`);
  return result;
}

export function rankRecipeCandidates(
  inputs: readonly RecipeCandidateRankingInput[],
): RecipeCandidateRankingResult {
  if (inputs.length < 2) throw new Error("Recipe candidate ranking requires at least two candidates.");
  const ids = new Set<string>();
  let targetReference: string | undefined;

  const prepared = inputs.map((input) => {
    const candidateId = input.candidateId.trim();
    if (!candidateId) throw new Error("Every recipe candidate requires a non-empty candidateId.");
    if (ids.has(candidateId)) throw new Error(`Duplicate recipe candidateId: ${candidateId}.`);
    ids.add(candidateId);
    if (!verifyRecipeEvidenceAssessmentReportBinding(input.assessmentReport)) {
      throw new Error(`Recipe assessment report integrity failed for ${candidateId}.`);
    }
    const candidateReference = input.assessmentReport.payload.targetReference;
    if (targetReference === undefined) targetReference = candidateReference;
    else if (targetReference !== candidateReference) {
      throw new Error(`All recipe candidates must share target reference ${targetReference}; received ${candidateReference}.`);
    }
    if (input.spectralRmse !== undefined && (!Number.isFinite(input.spectralRmse) || input.spectralRmse < 0)) {
      throw new Error(`spectralRmse for ${candidateId} must be finite and non-negative.`);
    }
    const classification = evidenceClass(input);
    const findings = input.assessmentReport.payload.assessment.findings;
    return {
      candidateId,
      targetReference: candidateReference,
      evidenceClass: classification,
      assessmentOutcome: input.assessmentReport.payload.outcomeStatus,
      atlasFitStatus: input.atlasFitStatus,
      structuralStatus: input.structuralStatus,
      metamerismStatus: input.metamerismStatus,
      spectralRmse: input.spectralRmse,
      adverseFindingCount: findings.filter((finding) => finding.status === "WATCH" || finding.status === "REVIEW" || finding.status === "BLOCK").length,
      missingMandatoryCount: findings.filter((finding) => finding.mandatoryForReviewableCandidate && finding.status === "MISSING").length,
      reasons: reasons(input, classification),
    };
  });

  prepared.sort((left, right) =>
    CLASS_ORDER[left.evidenceClass] - CLASS_ORDER[right.evidenceClass] ||
    left.missingMandatoryCount - right.missingMandatoryCount ||
    left.adverseFindingCount - right.adverseFindingCount ||
    (left.spectralRmse ?? Number.POSITIVE_INFINITY) - (right.spectralRmse ?? Number.POSITIVE_INFINITY) ||
    left.candidateId.localeCompare(right.candidateId)
  );

  return deepFreeze({
    schemaVersion: "ARBE_RECIPE_CANDIDATE_RANKING_V1",
    targetReference: targetReference!,
    method: "DETERMINISTIC_EVIDENCE_CLASS_AND_LEXICOGRAPHIC_ORDER_V1",
    rankedCandidates: prepared.map((candidate, index) => ({ ...candidate, rank: index + 1 })),
    claimBoundary: "This ranking prioritizes supplied recipe candidates by deterministic evidence class and explicit tie-breakers. It does not identify a best recipe, prove a global optimum, approve a recipe or grant production release.",
    limitations: [
      "Ranking quality is limited by the completeness and validity of the supplied evidence reports.",
      "Evidence classes are analytical prioritization categories, not production grades or probability scores.",
      "Spectral RMSE is used only as a final within-class tie-breaker and does not override blocking, missing or review evidence.",
      "Candidate components remain candidate-space data and are not ARBE identities.",
    ],
  });
}
