import {
  createRecipeIntelligenceContract,
  type RecipeIntelligenceOutcomeStatus,
  type RecipeIntelligenceRequirementId,
} from "./recipe-intelligence-contract";

export type RecipeEvidenceStatus = "PRESENT" | "WATCH" | "REVIEW" | "BLOCK" | "MISSING";

export interface RecipeEvidenceItem {
  readonly requirementId: RecipeIntelligenceRequirementId;
  readonly status: RecipeEvidenceStatus;
  readonly evidence: string;
}

export interface RecipeEvidenceFinding {
  readonly sequence: number;
  readonly requirementId: RecipeIntelligenceRequirementId;
  readonly mandatoryForReviewableCandidate: boolean;
  readonly status: RecipeEvidenceStatus;
  readonly evidence: string;
  readonly interpretation: string;
}

export interface RecipeEvidenceAssessment {
  readonly schemaVersion: "ARBE_RECIPE_EVIDENCE_ASSESSMENT_V1";
  readonly targetReference: string;
  readonly method: "DETERMINISTIC_RECIPE_CONTRACT_ASSESSMENT_V1";
  readonly outcomeStatus: RecipeIntelligenceOutcomeStatus;
  readonly completedMandatoryRequirements: number;
  readonly requiredMandatoryRequirements: 6;
  readonly findings: readonly RecipeEvidenceFinding[];
  readonly materialAndProcessContext: "DOCUMENTED" | "NOT_DOCUMENTED" | "REVIEW_REQUIRED" | "BLOCKED";
  readonly nextAction: string;
  readonly prohibitedClaims: readonly string[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

const REQUIRED_IDS: readonly RecipeIntelligenceRequirementId[] = Object.freeze([
  "ATLAS_REFERENCE_BOUND",
  "CANDIDATE_RECIPE_AVAILABLE",
  "CANDIDATE_SPECTRUM_AVAILABLE",
  "ATLAS_FIT_EVIDENCE_AVAILABLE",
  "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED",
  "METAMERISM_EVIDENCE_AVAILABLE",
  "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED",
]);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function interpretation(status: RecipeEvidenceStatus, mandatory: boolean): string {
  if (status === "PRESENT") return "Required evidence is present for this analytical assessment.";
  if (status === "WATCH") return "Evidence is present with a watch-level limitation requiring attention.";
  if (status === "REVIEW") return "Evidence is present but requires technical review before relying on the candidate.";
  if (status === "BLOCK") return "Supplied evidence contains a blocking finding.";
  return mandatory
    ? "Mandatory evidence is missing; the recipe candidate is not analytically reviewable."
    : "Production-context evidence is not documented; analytical review may continue without production qualification.";
}

function assertItems(items: readonly RecipeEvidenceItem[]): Map<RecipeIntelligenceRequirementId, RecipeEvidenceItem> {
  const map = new Map<RecipeIntelligenceRequirementId, RecipeEvidenceItem>();
  for (const item of items) {
    if (!REQUIRED_IDS.includes(item.requirementId)) throw new Error(`Unknown recipe evidence requirement: ${item.requirementId}.`);
    if (map.has(item.requirementId)) throw new Error(`Duplicate recipe evidence requirement: ${item.requirementId}.`);
    if (!item.evidence.trim()) throw new Error(`Recipe evidence ${item.requirementId} requires a non-empty evidence statement.`);
    map.set(item.requirementId, item);
  }
  for (const id of REQUIRED_IDS) {
    if (!map.has(id)) throw new Error(`Recipe evidence assessment requires an explicit item for ${id}.`);
  }
  return map;
}

export function assessRecipeEvidence(
  targetReference: string,
  items: readonly RecipeEvidenceItem[],
): RecipeEvidenceAssessment {
  const contract = createRecipeIntelligenceContract(targetReference);
  const supplied = assertItems(items);
  const findings = contract.requirements.map((requirement) => {
    const item = supplied.get(requirement.id)!;
    return {
      sequence: requirement.sequence,
      requirementId: requirement.id,
      mandatoryForReviewableCandidate: requirement.mandatoryForReviewableCandidate,
      status: item.status,
      evidence: item.evidence,
      interpretation: interpretation(item.status, requirement.mandatoryForReviewableCandidate),
    } satisfies RecipeEvidenceFinding;
  });

  const mandatory = findings.filter((finding) => finding.mandatoryForReviewableCandidate);
  const completedMandatoryRequirements = mandatory.filter((finding) => finding.status !== "MISSING").length;
  let outcomeStatus: RecipeIntelligenceOutcomeStatus;
  if (mandatory.some((finding) => finding.status === "BLOCK")) outcomeStatus = "RECIPE_BLOCKED_BY_EVIDENCE";
  else if (mandatory.some((finding) => finding.status === "MISSING")) outcomeStatus = "RECIPE_EVIDENCE_INCOMPLETE";
  else if (mandatory.some((finding) => finding.status === "REVIEW" || finding.status === "WATCH")) {
    outcomeStatus = "RECIPE_TECHNICAL_REVIEW_REQUIRED";
  } else outcomeStatus = "RECIPE_CANDIDATE_REVIEWABLE";

  const context = supplied.get("MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED")!.status;
  const materialAndProcessContext = context === "PRESENT"
    ? "DOCUMENTED"
    : context === "BLOCK"
      ? "BLOCKED"
      : context === "WATCH" || context === "REVIEW"
        ? "REVIEW_REQUIRED"
        : "NOT_DOCUMENTED";

  const nextAction = outcomeStatus === "RECIPE_BLOCKED_BY_EVIDENCE"
    ? "Resolve blocking evidence before any further recipe qualification."
    : outcomeStatus === "RECIPE_EVIDENCE_INCOMPLETE"
      ? "Provide all missing mandatory evidence before analytical recipe review."
      : outcomeStatus === "RECIPE_TECHNICAL_REVIEW_REQUIRED"
        ? "Perform technical review of watch and review findings before advancing the candidate."
        : materialAndProcessContext === "DOCUMENTED"
          ? "Candidate may proceed to controlled physical qualification; no approval is implied."
          : "Candidate is analytically reviewable; document material and process context before physical qualification.";

  return deepFreeze({
    schemaVersion: "ARBE_RECIPE_EVIDENCE_ASSESSMENT_V1",
    targetReference,
    method: "DETERMINISTIC_RECIPE_CONTRACT_ASSESSMENT_V1",
    outcomeStatus,
    completedMandatoryRequirements,
    requiredMandatoryRequirements: 6,
    findings,
    materialAndProcessContext,
    nextAction,
    prohibitedClaims: contract.prohibitedClaims,
    claimBoundary: contract.claimBoundary,
    limitations: [
      ...contract.limitations,
      "This assessment evaluates supplied evidence states and does not independently recompute the underlying scientific evidence.",
      "PRESENT means supplied and contract-complete, not scientifically validated for a production process.",
    ],
  });
}
