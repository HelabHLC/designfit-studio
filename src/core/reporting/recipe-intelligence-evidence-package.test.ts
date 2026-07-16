import assert from "node:assert/strict";
import test from "node:test";
import {
  assessRecipeEvidence,
  createRecipeDecisionSupport,
  rankRecipeCandidates,
  type RecipeEvidenceItem,
} from "../mixlock";
import { createRecipeDecisionSupportReportBinding } from "./recipe-decision-support-report-binding";
import { createRecipeEvidenceAssessmentReportBinding } from "./recipe-evidence-assessment-report-binding";
import {
  createRecipeIntelligenceEvidencePackage,
  verifyRecipeIntelligenceEvidencePackage,
} from "./recipe-intelligence-evidence-package";

const target = "H250_L050_C030";
const requirementIds = [
  "ATLAS_REFERENCE_BOUND",
  "CANDIDATE_RECIPE_AVAILABLE",
  "CANDIDATE_SPECTRUM_AVAILABLE",
  "ATLAS_FIT_EVIDENCE_AVAILABLE",
  "SPECTRAL_INTELLIGENCE_PACKAGE_VERIFIED",
  "METAMERISM_EVIDENCE_AVAILABLE",
  "MATERIAL_AND_PROCESS_CONTEXT_DOCUMENTED",
] as const;

function assessmentReport() {
  const items: RecipeEvidenceItem[] = requirementIds.map((requirementId) => ({
    requirementId,
    status: "PRESENT",
    evidence: `${requirementId} supplied.`,
  }));
  return createRecipeEvidenceAssessmentReportBinding(assessRecipeEvidence(target, items));
}

function sources() {
  const a = assessmentReport();
  const b = assessmentReport();
  const ranking = rankRecipeCandidates([
    {
      candidateId: "candidate-a",
      assessmentReport: a,
      atlasFitStatus: "REFERENCE_LOCKED",
      spectralRmse: 0.01,
      structuralStatus: "STRUCTURALLY_STABLE",
      metamerismStatus: "REFERENCE_LOCKED_METAMERISM_LOW",
    },
    {
      candidateId: "candidate-b",
      assessmentReport: b,
      atlasFitStatus: "REFERENCE_LOCKED",
      spectralRmse: 0.02,
      structuralStatus: "STRUCTURALLY_STABLE",
      metamerismStatus: "REFERENCE_LOCKED_METAMERISM_LOW",
    },
  ]);
  const decisionReport = createRecipeDecisionSupportReportBinding(createRecipeDecisionSupport(ranking));
  return {
    decisionReport,
    assessments: [
      { candidateId: "candidate-a", assessmentReport: a },
      { candidateId: "candidate-b", assessmentReport: b },
    ],
  };
}

test("creates deterministic and verifiable recipe evidence package", () => {
  const { decisionReport, assessments } = sources();
  const left = createRecipeIntelligenceEvidencePackage(decisionReport, assessments);
  const right = createRecipeIntelligenceEvidencePackage(decisionReport, [...assessments].reverse());
  assert.deepEqual(left, right);
  assert.equal(verifyRecipeIntelligenceEvidencePackage(left), true);
  assert.equal(left.payload.candidateCount, 2);
  assert.equal(left.payload.candidateAssessments[0].candidateId, "candidate-a");
});

test("rejects missing, duplicate and foreign candidate assessments", () => {
  const { decisionReport, assessments } = sources();
  assert.throws(
    () => createRecipeIntelligenceEvidencePackage(decisionReport, assessments.slice(0, 1)),
    /exactly one assessment/,
  );
  assert.throws(
    () => createRecipeIntelligenceEvidencePackage(decisionReport, [assessments[0], assessments[0]]),
    /Duplicate/,
  );
  assert.throws(
    () => createRecipeIntelligenceEvidencePackage(decisionReport, [assessments[0], { ...assessments[1], candidateId: "foreign" }]),
    /Missing recipe assessment/,
  );
});

test("detects package tampering and freezes nested data", () => {
  const { decisionReport, assessments } = sources();
  const packageValue = createRecipeIntelligenceEvidencePackage(decisionReport, assessments);
  const tampered = {
    ...packageValue,
    payload: { ...packageValue.payload, candidateCount: 9 },
  };
  assert.equal(verifyRecipeIntelligenceEvidencePackage(tampered), false);
  assert.equal(Object.isFrozen(packageValue), true);
  assert.equal(Object.isFrozen(packageValue.payload), true);
  assert.equal(Object.isFrozen(packageValue.payload.candidateAssessments), true);
  assert.equal(Object.isFrozen(packageValue.payload.candidateAssessments[0]), true);
});
