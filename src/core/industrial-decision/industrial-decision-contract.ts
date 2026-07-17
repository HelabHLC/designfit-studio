import type { IndustrialValidationAssessment } from "../industrial-validation";

export type IndustrialDecisionModule =
  | "INDUSTRIAL_VALIDATION"
  | "ATLASFIT"
  | "SPECTRAL_INTELLIGENCE"
  | "MIXLOCK"
  | "SPECTRAL_SCISSOR"
  | "METAMERISM";

export type IndustrialModuleFindingStatus =
  | "SUPPORTS_REVIEW"
  | "CAUTION"
  | "BLOCKS_REVIEW"
  | "NOT_RUN";

export interface IndustrialModuleFinding {
  readonly module: IndustrialDecisionModule;
  readonly status: IndustrialModuleFindingStatus;
  readonly evidenceSha256: string;
  readonly summary: string;
  readonly limitations: readonly string[];
}

export interface IndustrialDecisionContractInput {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_INPUT_V1";
  readonly targetReference: string;
  readonly validation: IndustrialValidationAssessment;
  readonly findings: readonly IndustrialModuleFinding[];
}

export interface IndustrialDecisionContract {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1";
  readonly targetReference: string;
  readonly domain: IndustrialValidationAssessment["domain"];
  readonly readiness: "READY_FOR_DECISION_SYNTHESIS" | "REQUIRES_ADDITIONAL_EVIDENCE";
  readonly validationDecision: IndustrialValidationAssessment["decision"];
  readonly findings: readonly IndustrialModuleFinding[];
  readonly blockingModules: readonly IndustrialDecisionModule[];
  readonly cautionModules: readonly IndustrialDecisionModule[];
  readonly evidenceBindings: readonly {
    readonly module: IndustrialDecisionModule;
    readonly evidenceSha256: string;
  }[];
  readonly prohibitedClaims: readonly [
    "VISUAL_EQUALITY_CONFIRMED",
    "SPECTRAL_EQUIVALENCE_CONFIRMED",
    "ROOT_CAUSE_CONFIRMED",
    "RECIPE_APPROVED",
    "PRODUCTION_RELEASE_GRANTED"
  ];
  readonly claimBoundary: string;
}

const REFERENCE = /^H\d{3}_L\d{3}_C\d{3}$/;
const SHA256 = /^[a-f0-9]{64}$/;

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validateFinding(finding: IndustrialModuleFinding): void {
  if (!SHA256.test(finding.evidenceSha256)) {
    throw new Error(`${finding.module} evidence binding must be a lowercase SHA-256 value.`);
  }
  if (!finding.summary.trim()) throw new Error(`${finding.module} finding summary must not be empty.`);
  if (finding.status === "NOT_RUN" && finding.limitations.length === 0) {
    throw new Error(`${finding.module} must explain why it was not run.`);
  }
}

export function createIndustrialDecisionContract(input: IndustrialDecisionContractInput): IndustrialDecisionContract {
  if (input.schemaVersion !== "ARBE_INDUSTRIAL_DECISION_CONTRACT_INPUT_V1") {
    throw new Error("Unsupported industrial decision contract input schema.");
  }
  if (!REFERENCE.test(input.targetReference)) throw new Error("Industrial decision reference must match Hxxx_Lxxx_Cxxx.");
  if (input.validation.schemaVersion !== "ARBE_INDUSTRIAL_VALIDATION_ASSESSMENT_V1") {
    throw new Error("Industrial decision contract requires Industrial Validation Assessment v1.");
  }
  if (input.targetReference !== input.validation.targetReference) {
    throw new Error("Industrial decision input and validation assessment must bind the same ARBE reference.");
  }
  if (input.findings.length === 0) throw new Error("Industrial decision contract requires at least one module finding.");

  const seen = new Set<IndustrialDecisionModule>();
  for (const finding of input.findings) {
    validateFinding(finding);
    if (seen.has(finding.module)) throw new Error(`Duplicate industrial decision module finding: ${finding.module}.`);
    seen.add(finding.module);
  }

  const orderedFindings = [...input.findings].sort((left, right) => left.module.localeCompare(right.module));
  const blockingModules = orderedFindings.filter((item) => item.status === "BLOCKS_REVIEW").map((item) => item.module);
  const cautionModules = orderedFindings.filter((item) => item.status === "CAUTION" || item.status === "NOT_RUN").map((item) => item.module);
  const readiness = input.validation.decision === "READY_FOR_TECHNICAL_REVIEW" && blockingModules.length === 0
    ? "READY_FOR_DECISION_SYNTHESIS"
    : "REQUIRES_ADDITIONAL_EVIDENCE";

  return freeze({
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1",
    targetReference: input.targetReference,
    domain: input.validation.domain,
    readiness,
    validationDecision: input.validation.decision,
    findings: orderedFindings,
    blockingModules,
    cautionModules,
    evidenceBindings: orderedFindings.map(({ module, evidenceSha256 }) => ({ module, evidenceSha256 })),
    prohibitedClaims: [
      "VISUAL_EQUALITY_CONFIRMED",
      "SPECTRAL_EQUIVALENCE_CONFIRMED",
      "ROOT_CAUSE_CONFIRMED",
      "RECIPE_APPROVED",
      "PRODUCTION_RELEASE_GRANTED",
    ],
    claimBoundary: "This contract normalizes evidence-bearing module findings for later decision synthesis only. It does not confirm equivalence or root cause, approve a recipe, or grant production release.",
  });
}
