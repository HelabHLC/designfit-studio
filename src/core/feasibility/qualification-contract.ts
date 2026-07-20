export type FeasibilityStatus = "NOT_EVALUATED" | "CONDITIONAL" | "FEASIBLE" | "NOT_FEASIBLE";

export interface FeasibilityContext {
  readonly materialSystem: string;
  readonly substrate: string;
  readonly colorantSystem: string;
  readonly processRoute: string;
  readonly illuminants: readonly string[];
  readonly toleranceDeltaE00: number;
  readonly requiredFastness?: Readonly<Record<string, string>>;
  readonly environmentalConstraints?: readonly string[];
}

export interface FeasibilityEvidence {
  readonly evidenceId: string;
  readonly evidenceType: "SPECTRAL_REFERENCE" | "RECIPE_PREDICTION" | "FASTNESS_PREDICTION" | "PROCESS_GAMUT" | "TRIAL_MEASUREMENT" | "PRODUCTION_MEASUREMENT";
  readonly source: string;
  readonly datasetId?: string;
  readonly referenceId?: string;
  readonly note?: string;
}

export interface FeasibilityCriterion {
  readonly criterionId: string;
  readonly title: string;
  readonly required: boolean;
  readonly result: "PASS" | "FAIL" | "UNKNOWN";
  readonly evidenceIds: readonly string[];
  readonly note?: string;
}

export interface FeasibilityQualification {
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly status: FeasibilityStatus;
  readonly context: FeasibilityContext;
  readonly evidence: readonly FeasibilityEvidence[];
  readonly criteria: readonly FeasibilityCriterion[];
  readonly blockingCriterionIds: readonly string[];
  readonly unresolvedCriterionIds: readonly string[];
  readonly statement: string;
}
