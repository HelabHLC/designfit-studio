export type IndustrialValidationDomain =
  | "PRINT"
  | "COATINGS"
  | "TEXTILES"
  | "PIGMENTS"
  | "PAPER"
  | "SUBSTRATES";

export interface IndustrialDatasetProvenance {
  readonly datasetId: string;
  readonly sourceOrganization: string;
  readonly sourceSystem: string;
  readonly acquiredAtUtc: string;
  readonly sourceSha256: string;
}

export interface IndustrialMeasurementConditions {
  readonly instrumentManufacturer: string;
  readonly instrumentModel: string;
  readonly geometry: string;
  readonly illuminant: string;
  readonly observer: string;
  readonly wavelengthStartNm: number;
  readonly wavelengthEndNm: number;
  readonly wavelengthStepNm: number;
  readonly calibrationStatus: "DOCUMENTED" | "NOT_DOCUMENTED";
}

export interface IndustrialValidationInput {
  readonly schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_INPUT_V1";
  readonly targetReference: string;
  readonly domain: IndustrialValidationDomain;
  readonly provenance: IndustrialDatasetProvenance;
  readonly measurement: IndustrialMeasurementConditions;
  readonly runtimeEvidenceSha256: string;
  readonly referenceBindingSha256: string;
}

export type IndustrialValidationIssueCode =
  | "INVALID_REFERENCE"
  | "INVALID_TIMESTAMP"
  | "INVALID_SHA256"
  | "INCOMPLETE_PROVENANCE"
  | "INCOMPLETE_MEASUREMENT_CONDITIONS"
  | "CALIBRATION_NOT_DOCUMENTED"
  | "INVALID_SPECTRAL_RANGE";

export interface IndustrialValidationIssue {
  readonly code: IndustrialValidationIssueCode;
  readonly severity: "BLOCKING" | "CAUTION";
  readonly field: string;
  readonly explanation: string;
}

export interface IndustrialValidationAssessment {
  readonly schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_ASSESSMENT_V1";
  readonly targetReference: string;
  readonly domain: IndustrialValidationDomain;
  readonly decision: "READY_FOR_TECHNICAL_REVIEW" | "INSUFFICIENT_VALIDATION_EVIDENCE";
  readonly issues: readonly IndustrialValidationIssue[];
  readonly evidenceBindings: {
    readonly datasetSha256: string;
    readonly runtimeEvidenceSha256: string;
    readonly referenceBindingSha256: string;
  };
  readonly prohibitedClaims: readonly [
    "VISUAL_EQUALITY_CONFIRMED",
    "SPECTRAL_EQUIVALENCE_CONFIRMED",
    "ROOT_CAUSE_CONFIRMED",
    "RECIPE_APPROVED",
    "PRODUCTION_RELEASE_GRANTED"
  ];
  readonly claimBoundary: string;
}

const SHA256 = /^[a-f0-9]{64}$/;
const REFERENCE = /^H\d{3}_L\d{3}_C\d{3}$/;

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function issue(
  code: IndustrialValidationIssueCode,
  severity: IndustrialValidationIssue["severity"],
  field: string,
  explanation: string,
): IndustrialValidationIssue {
  return { code, severity, field, explanation };
}

export function assessIndustrialValidation(input: IndustrialValidationInput): IndustrialValidationAssessment {
  if (input.schemaVersion !== "ARBE_INDUSTRIAL_VALIDATION_INPUT_V1") {
    throw new Error("Unsupported industrial validation input schema.");
  }

  const issues: IndustrialValidationIssue[] = [];

  if (!REFERENCE.test(input.targetReference)) {
    issues.push(issue("INVALID_REFERENCE", "BLOCKING", "targetReference", "The ARBE identity must match Hxxx_Lxxx_Cxxx."));
  }

  const provenanceFields = [input.provenance.datasetId, input.provenance.sourceOrganization, input.provenance.sourceSystem];
  if (provenanceFields.some((value) => !isNonEmpty(value))) {
    issues.push(issue("INCOMPLETE_PROVENANCE", "BLOCKING", "provenance", "Dataset identity, source organization and source system must be documented."));
  }

  if (!Number.isFinite(Date.parse(input.provenance.acquiredAtUtc)) || !input.provenance.acquiredAtUtc.endsWith("Z")) {
    issues.push(issue("INVALID_TIMESTAMP", "BLOCKING", "provenance.acquiredAtUtc", "Acquisition time must be a valid UTC timestamp."));
  }

  for (const [field, value] of [
    ["provenance.sourceSha256", input.provenance.sourceSha256],
    ["runtimeEvidenceSha256", input.runtimeEvidenceSha256],
    ["referenceBindingSha256", input.referenceBindingSha256],
  ] as const) {
    if (!SHA256.test(value)) issues.push(issue("INVALID_SHA256", "BLOCKING", field, "Evidence bindings must be lowercase SHA-256 values."));
  }

  const measurementFields = [
    input.measurement.instrumentManufacturer,
    input.measurement.instrumentModel,
    input.measurement.geometry,
    input.measurement.illuminant,
    input.measurement.observer,
  ];
  if (measurementFields.some((value) => !isNonEmpty(value))) {
    issues.push(issue("INCOMPLETE_MEASUREMENT_CONDITIONS", "BLOCKING", "measurement", "Instrument and viewing-condition metadata must be documented."));
  }

  const { wavelengthStartNm, wavelengthEndNm, wavelengthStepNm } = input.measurement;
  if (
    !Number.isFinite(wavelengthStartNm) ||
    !Number.isFinite(wavelengthEndNm) ||
    !Number.isFinite(wavelengthStepNm) ||
    wavelengthStartNm < 300 ||
    wavelengthEndNm > 830 ||
    wavelengthStartNm >= wavelengthEndNm ||
    wavelengthStepNm <= 0 ||
    (wavelengthEndNm - wavelengthStartNm) % wavelengthStepNm !== 0
  ) {
    issues.push(issue("INVALID_SPECTRAL_RANGE", "BLOCKING", "measurement.wavelengthRange", "The spectral range must be finite, ordered and evenly divisible by the wavelength step."));
  }

  if (input.measurement.calibrationStatus !== "DOCUMENTED") {
    issues.push(issue("CALIBRATION_NOT_DOCUMENTED", "CAUTION", "measurement.calibrationStatus", "Calibration evidence is not documented; technical review must treat measurement quality as unconfirmed."));
  }

  const decision = issues.some((item) => item.severity === "BLOCKING")
    ? "INSUFFICIENT_VALIDATION_EVIDENCE"
    : "READY_FOR_TECHNICAL_REVIEW";

  return freeze({
    schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_ASSESSMENT_V1",
    targetReference: input.targetReference,
    domain: input.domain,
    decision,
    issues,
    evidenceBindings: {
      datasetSha256: input.provenance.sourceSha256,
      runtimeEvidenceSha256: input.runtimeEvidenceSha256,
      referenceBindingSha256: input.referenceBindingSha256,
    },
    prohibitedClaims: [
      "VISUAL_EQUALITY_CONFIRMED",
      "SPECTRAL_EQUIVALENCE_CONFIRMED",
      "ROOT_CAUSE_CONFIRMED",
      "RECIPE_APPROVED",
      "PRODUCTION_RELEASE_GRANTED",
    ],
    claimBoundary: "This assessment verifies documentation completeness and evidence binding only. It does not establish visual equality, spectral equivalence, confirmed root cause, recipe approval or production release.",
  });
}
