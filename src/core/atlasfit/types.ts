import type { LabColor } from "../reference";

export type AtlasReference = `H${string}_L${string}_C${string}`;

export type AtlasFitInput =
  | { readonly kind: "ATLAS_REFERENCE"; readonly reference: AtlasReference }
  | { readonly kind: "LAB_REQUEST"; readonly lab: LabColor }
  | { readonly kind: "HEX_REQUEST"; readonly hex: string }
  | { readonly kind: "RGB_REQUEST"; readonly rgb: readonly [number, number, number] }
  | { readonly kind: "DESCRIPTION_REQUEST"; readonly description: string };

export interface BoundReferenceEvidence {
  readonly targetReference: AtlasReference;
  readonly referenceSpace: "ARBE_ATLAS_MASTER_PKL";
  readonly masterDatasetSha256: string;
  readonly bindingMethod: string;
}

export interface RecipeComponent {
  readonly pigmentId: string;
  readonly fraction: number;
  readonly sourceClass: "RESTRICTED_INTERNAL" | "ARBE_MEASURED" | "OPEN_REFERENCE";
}

export interface RecipeCandidateEvidence {
  readonly candidateId: string;
  readonly candidateSpace: "EXTERNAL_PIGMENT_LIBRARY" | "ARBE_MEASURED";
  readonly components: readonly RecipeComponent[];
  readonly model: string;
  readonly isFinal: false;
}

export interface CurveEvidence {
  readonly deltaE00?: number;
  readonly spectralRmse?: number;
  readonly targetRank?: number;
  readonly nearestReference?: AtlasReference;
  readonly lockMargin?: number;
}

export type ScissorStatus =
  | "SCISSOR_LOCKED"
  | "SCISSOR_UNLOCKED"
  | "SCISSOR_INVALID"
  | "SCISSOR_NOT_RUN";

export interface ScissorEvidence {
  readonly status: ScissorStatus;
  readonly crossingsBefore?: number;
  readonly crossingsAfter?: number;
  readonly nearestAfterCorrection?: AtlasReference;
  readonly deltaDeltaLambdaNm?: number;
  readonly allowedLambdaDriftNm?: number;
}

export type MetamerismStatus =
  | "METAMERISM_LOW"
  | "METAMERISM_WARNING"
  | "METAMERISM_RISK"
  | "METAMERISM_NOT_RUN";

export interface MetamerismEvidence {
  readonly status: MetamerismStatus;
  readonly method?: string;
  readonly notes?: readonly string[];
}

export type AtlasFitFinalVerdict =
  | "REFERENCE_LOCKED_METAMERISM_LOW"
  | "REFERENCE_LOCKED_METAMERISM_WARNING"
  | "REFERENCE_LOCKED_METAMERISM_RISK"
  | "REFERENCE_UNLOCKED"
  | "NOT_FINAL_MISSING_EVIDENCE"
  | "INVALID_INPUT";

export interface AtlasFitAuditRun {
  readonly runId: string;
  readonly userRequest: AtlasFitInput;
  readonly boundReference?: BoundReferenceEvidence;
  readonly initialRecipeCandidate?: RecipeCandidateEvidence;
  readonly initialCurveEvidence?: CurveEvidence;
  readonly scissor?: ScissorEvidence;
  readonly scissoredTargetLab?: LabColor;
  readonly refinedRecipeCandidate?: RecipeCandidateEvidence;
  readonly finalCurveEvidence?: CurveEvidence;
  readonly metamerism?: MetamerismEvidence;
  readonly finalVerdict: AtlasFitFinalVerdict;
  readonly missingEvidence: readonly string[];
}
