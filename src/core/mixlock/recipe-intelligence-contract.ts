const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type RecipeIntelligenceRequirementId =
  | "ATLAS_REFERENCE_BOUND"
  | "CANDIDATE_RECIPE_AVAILABLE"
  | "CANDIDATE_SPECTRUM_AVAILABLE"
  | "ATLAS_FIT_EVIDENCE_AVAILABLE"
  | "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED"
  | "METAMERISM_EVIDENCE_AVAILABLE"
  | "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED";

export type RecipeIntelligenceOutcomeStatus =
  | "RECIPE_EVIDENCE_INCOMPLETE"
  | "RECIPE_CANDIDATE_REVIEWABLE"
  | "RECIPE_TECHNICAL_REVIEW_REQUIRED"
  | "RECIPE_BLOCKED_BY_EVIDENCE";

export interface RecipeIntelligenceRequirement {
  readonly sequence: number;
  readonly id: RecipeIntelligenceRequirementId;
  readonly requirement: string;
  readonly purpose: string;
  readonly mandatoryForReviewableCandidate: boolean;
}

export interface RecipeIntelligenceContract {
  readonly schemaVersion: "ARBE_RECIPE_INTELLIGENCE_CONTRACT_V1";
  readonly targetReference: string;
  readonly identityRule: "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY";
  readonly method: "DETERMINISTIC_RECIPE_EVIDENCE_CONTRACT_V1";
  readonly requirements: readonly RecipeIntelligenceRequirement[];
  readonly allowedOutcomeStatuses: readonly RecipeIntelligenceOutcomeStatus[];
  readonly prohibitedClaims: readonly string[];
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

export function createRecipeIntelligenceContract(targetReference: string): RecipeIntelligenceContract {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Recipe Intelligence target reference must match Hxxx_Lxxx_Cxxx.");
  }

  const requirements: RecipeIntelligenceRequirement[] = [
    {
      sequence: 1,
      id: "ATLAS_REFERENCE_BOUND",
      requirement: "An existing Hxxx_Lxxx_Cxxx record is bound as the recipe target.",
      purpose: "Prevents request values or external standards from becoming ARBE identities.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 2,
      id: "CANDIDATE_RECIPE_AVAILABLE",
      requirement: "A deterministic candidate recipe with normalized component weights is available.",
      purpose: "Provides the formulation candidate to be assessed without treating it as approved.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 3,
      id: "CANDIDATE_SPECTRUM_AVAILABLE",
      requirement: "The candidate recipe has a spectrum on the canonical 380–730 nm / 10 nm grid.",
      purpose: "Enables structural and atlas-bound comparison beyond a colorimetric request value.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 4,
      id: "ATLAS_FIT_EVIDENCE_AVAILABLE",
      requirement: "AtlasFit evidence exists for the candidate spectrum and the bound target reference.",
      purpose: "Records deterministic reference-relative candidate performance.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 5,
      id: "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED",
      requirement: "The WP05 Spectral Intelligence Evidence Package passes integrity verification.",
      purpose: "Carries structural findings, explanations and bounded investigation candidates into recipe review.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 6,
      id: "METAMERISM_EVIDENCE_AVAILABLE",
      requirement: "Defined multi-illuminant evidence is available for the candidate and target.",
      purpose: "Prevents a single-condition match from being presented as viewing-condition stability.",
      mandatoryForReviewableCandidate: true,
    },
    {
      sequence: 7,
      id: "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED",
      requirement: "Substrate, layer, geometry, material lot and relevant process conditions are documented.",
      purpose: "Separates analytical candidate assessment from production qualification.",
      mandatoryForReviewableCandidate: false,
    },
  ];

  return deepFreeze({
    schemaVersion: "ARBE_RECIPE_INTELLIGENCE_CONTRACT_V1",
    targetReference,
    identityRule: "ONLY_HLC_REFERENCE_IS_ARBE_IDENTITY",
    method: "DETERMINISTIC_RECIPE_EVIDENCE_CONTRACT_V1",
    requirements,
    allowedOutcomeStatuses: [
      "RECIPE_EVIDENCE_INCOMPLETE",
      "RECIPE_CANDIDATE_REVIEWABLE",
      "RECIPE_TECHNICAL_REVIEW_REQUIRED",
      "RECIPE_BLOCKED_BY_EVIDENCE",
    ],
    prohibitedClaims: [
      "GLOBAL_OPTIMUM_PROVEN",
      "PIGMENT_IDENTITY_CONFIRMED",
      "SPECTRAL_EQUIVALENCE_CERTIFIED",
      "VISUAL_IDENTITY_CERTIFIED",
      "RECIPE_APPROVED",
      "PRODUCTION_RELEASE_GRANTED",
    ],
    claimBoundary: "Recipe Intelligence evaluates evidence for a recipe candidate. It does not prove a global optimum, identify material composition, certify equivalence, approve a recipe or grant production release.",
    limitations: [
      "A recipe candidate remains candidate-space evidence and is not an ARBE identity.",
      "Analytical thresholds are not production tolerances unless separately validated and approved.",
      "Material and process qualification requires controlled physical trials and documented production context.",
      "External pigment or standard identities require authoritative or licensed source data.",
    ],
  });
}
