import type { MixLockReportModel } from "./mixlock-report";

export const demoMixLockReport: MixLockReportModel = {
  reportId: "ARBE-MLR-DEMO-001",
  generatedAt: "2026-07-14T12:45:00Z",
  targetReference: "H075_L080_C100",
  finalStatus: "REFERENCE_LOCKED_METAMERISM_LOW",
  finalVerdict: "FINAL_REFERENCE_LOCK",
  confidence: "HIGH",
  request: {
    type: "Golden acceptance fixture",
    value: "H075_L080_C100",
    identityRule: "REQUEST_ONLY",
  },
  reference: {
    nearestReference: "H075_L080_C100",
    targetRank: 1,
  },
  recipe1: [
    { pigmentId: "Candidate A", weight: 0.36 },
    { pigmentId: "Candidate B", weight: 0.42 },
    { pigmentId: "Candidate C", weight: 0.22 },
  ],
  scissor: {
    crossingsBefore: 8,
    crossingsAfter: 0,
    lambdaV2Nm: 551.72,
    lambdaEeNm: 548.11,
    deltaLambdaNm: 3.61,
    masterDeltaLambdaNm: 4.02,
    deltaDeltaLambdaNm: -0.41,
    driftStatus: "STABLE",
  },
  recipe2: [
    { pigmentId: "Candidate A", weight: 0.34 },
    { pigmentId: "Candidate B", weight: 0.45 },
    { pigmentId: "Candidate C", weight: 0.21 },
  ],
  metamerism: {
    classification: "LOW",
    maximumDeltaE00: 0.83,
    maximumIlluminant: "F11",
    evaluations: [
      { illuminant: "D50", deltaE00: 0.41 },
      { illuminant: "D65", deltaE00: 0.44 },
      { illuminant: "A", deltaE00: 0.78 },
      { illuminant: "F11", deltaE00: 0.83 },
    ],
  },
  audit: {
    runtimeVersion: "ARBE lambda star Runtime v1",
    runtimeCommit: "0255a4a780c11743880ce533128a61dda1d73395",
    datasetId: "ARBE_MASTER_RUNTIME",
    datasetSha256: "demo-provenance-only",
    lambdaV2Method: "Brent",
  },
  limitations: [
    "Demonstration report; values not explicitly sourced from runtime evidence are illustrative.",
    "Pigment labels are neutral candidate identifiers and do not imply bundled third-party data.",
    "Reference validation is not production approval or certification.",
  ],
};
