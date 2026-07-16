import assert from "node:assert/strict";
import test from "node:test";
import type { MetamerismEvidence } from "../metamerism";
import type { StructuralDriftEvidence } from "../scissor";
import { createSpectralMomentDescriptor } from "./moment-descriptor";
import { createStructuralIntelligenceAssessment, type StructuralIntelligencePolicy } from "./structural-intelligence";
import { createSpectralWindowStructure } from "./window-structure";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const spectrum = (reflectance: readonly number[]) => ({ wavelengthsNm, reflectance });
const referenceId = "H000_L050_C000";

const policy: StructuralIntelligencePolicy = {
  dispersionSigmaWatchNm: 2,
  dispersionSigmaReviewNm: 5,
  dispersionSigmaBlockNm: 10,
  skewDeltaWatch: 0.1,
  skewDeltaReview: 0.3,
  skewDeltaBlock: 0.6,
  activeWindowShareThreshold: 0.1,
  localizedDominantShareThreshold: 0.7,
  distributedWindowCountThreshold: 3,
  oscillatorySignChangeThreshold: 4,
};

function drift(status: StructuralDriftEvidence["driftStatus"] = "STABLE"): StructuralDriftEvidence {
  return {
    lambdaV2Nm: 555,
    lambdaEeNm: 555,
    deltaLambdaNm: 0,
    masterDeltaLambdaNm: 0,
    deltaDeltaLambdaNm: status === "BLOCK" ? 25 : 0,
    driftStatus: status,
    method: "ARBE_STRUCTURAL_DRIFT_V04",
    lambdaV2Method: "Brent",
  };
}

function metamerism(status: MetamerismEvidence["status"] = "REFERENCE_LOCKED_METAMERISM_LOW"): MetamerismEvidence {
  return {
    status,
    targetReference: referenceId,
    referenceLocked: status !== "METAMERISM_INVALID",
    evaluations: [
      { illuminant: "D50", deltaE00: 0.4 },
      { illuminant: "D65", deltaE00: status === "REFERENCE_LOCKED_METAMERISM_RISK" ? 4 : 0.7 },
    ],
    maximumDeltaE00: status === "REFERENCE_LOCKED_METAMERISM_RISK" ? 4 : 0.7,
    maximumIlluminant: "D65",
    thresholds: { warningDeltaE00: 1, riskDeltaE00: 3 },
    method: "PRECOMPUTED_MULTI_ILLUMINANT_DELTA_E00_GATE",
    verdict: status === "METAMERISM_INVALID" ? "NOT_FINAL" : "METAMERISM_QUALIFIED",
    limitations: ["Not a production approval."],
  };
}

function stableInput() {
  const flat = spectrum(wavelengthsNm.map(() => 0.5));
  return {
    targetReference: referenceId,
    referenceMoment: createSpectralMomentDescriptor(referenceId, flat),
    candidateMoment: createSpectralMomentDescriptor(referenceId, flat),
    windowStructure: createSpectralWindowStructure(referenceId, flat, flat),
    structuralDrift: drift(),
    metamerism: metamerism(),
    policy,
  } as const;
}

test("creates a deterministic structurally stable assessment", () => {
  const left = createStructuralIntelligenceAssessment(stableInput());
  const right = createStructuralIntelligenceAssessment(stableInput());

  assert.deepEqual(left, right);
  assert.equal(left.overallStatus, "STRUCTURALLY_STABLE");
  assert.equal(left.windowPattern, "NO_DIFFERENCE");
  assert.equal(left.completedDomains, 5);
  assert.ok(left.findings.every((finding) => finding.status === "PASS"));
});

test("marks otherwise stable evidence incomplete when metamerism is absent", () => {
  const { metamerism: _metamerism, ...input } = stableInput();
  const result = createStructuralIntelligenceAssessment(input);

  assert.equal(result.overallStatus, "STRUCTURAL_EVIDENCE_INCOMPLETE");
  assert.equal(result.completedDomains, 4);
  assert.equal(result.findings.at(-1)?.status, "NOT_PERFORMED");
});

test("propagates blocking structural drift and metamerism risk", () => {
  const result = createStructuralIntelligenceAssessment({
    ...stableInput(),
    structuralDrift: drift("BLOCK"),
    metamerism: metamerism("REFERENCE_LOCKED_METAMERISM_RISK"),
  });

  assert.equal(result.overallStatus, "STRUCTURAL_BLOCK");
  assert.equal(result.findings[0].status, "BLOCK");
  assert.equal(result.findings[4].status, "BLOCK");
});

test("detects oscillatory local window structure as review evidence", () => {
  const reference = spectrum(wavelengthsNm.map(() => 0.5));
  const candidate = spectrum(wavelengthsNm.map((wavelength) =>
    wavelength >= 620 && wavelength <= 670
      ? (wavelength % 20 === 0 ? 0.6 : 0.4)
      : 0.5,
  ));
  const result = createStructuralIntelligenceAssessment({
    ...stableInput(),
    candidateMoment: createSpectralMomentDescriptor(referenceId, candidate),
    windowStructure: createSpectralWindowStructure(referenceId, reference, candidate),
  });

  assert.equal(result.windowPattern, "OSCILLATORY");
  assert.equal(result.overallStatus, "STRUCTURAL_REVIEW");
  assert.equal(result.findings[3].status, "REVIEW");
});

test("rejects target mismatches and invalid policy ordering", () => {
  const mismatchedMoment = createSpectralMomentDescriptor(
    "H010_L050_C000",
    spectrum(wavelengthsNm.map(() => 0.5)),
  );
  assert.throws(
    () => createStructuralIntelligenceAssessment({
      ...stableInput(),
      candidateMoment: mismatchedMoment,
    }),
    /target mismatch/,
  );
  assert.throws(
    () => createStructuralIntelligenceAssessment({
      ...stableInput(),
      policy: { ...policy, dispersionSigmaReviewNm: 1 },
    }),
    /strictly ordered/,
  );
});

test("returns deeply frozen assessment objects", () => {
  const result = createStructuralIntelligenceAssessment(stableInput());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.findings), true);
  assert.equal(Object.isFrozen(result.findings[0]), true);
  assert.equal(Object.isFrozen(result.policy), true);
  assert.equal(Object.isFrozen(result.limitations), true);
});
