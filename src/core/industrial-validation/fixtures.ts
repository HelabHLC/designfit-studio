import type { IndustrialValidationInput } from "./industrial-validation-contract";

export const COMPLETE_INDUSTRIAL_VALIDATION_INPUT: IndustrialValidationInput = {
  schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_INPUT_V1",
  targetReference: "H005_L070_C030",
  domain: "COATINGS",
  provenance: {
    datasetId: "dataset-001",
    sourceOrganization: "Example Laboratory",
    sourceSystem: "spectral-lims",
    acquiredAtUtc: "2026-07-17T08:00:00Z",
    sourceSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  measurement: {
    instrumentManufacturer: "Example Instruments",
    instrumentModel: "Sphere 45",
    geometry: "d/8",
    illuminant: "D50",
    observer: "2_DEGREE",
    wavelengthStartNm: 380,
    wavelengthEndNm: 730,
    wavelengthStepNm: 10,
    calibrationStatus: "DOCUMENTED",
  },
  runtimeEvidenceSha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  referenceBindingSha256: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
};
