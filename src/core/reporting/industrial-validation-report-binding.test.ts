import assert from "node:assert/strict";
import test from "node:test";
import { assessIndustrialValidation } from "../industrial-validation";
import { COMPLETE_INDUSTRIAL_VALIDATION_INPUT } from "../industrial-validation/fixtures";
import {
  computeIndustrialValidationReportSha256,
  createIndustrialValidationReportBinding,
  verifyIndustrialValidationReportBinding,
} from "./industrial-validation-report-binding";

test("creates a deterministic reference-bound industrial validation report", () => {
  const assessment = assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT);
  const left = createIndustrialValidationReportBinding(assessment);
  const right = createIndustrialValidationReportBinding(assessment);

  assert.equal(left.payload.targetReference, "H005_L070_C030");
  assert.equal(left.payload.decision, "READY_FOR_TECHNICAL_REVIEW");
  assert.equal(left.integrity.payloadSha256, right.integrity.payloadSha256);
  assert.equal(left.integrity.payloadSha256, computeIndustrialValidationReportSha256(left.payload));
  assert.equal(verifyIndustrialValidationReportBinding(left), true);
  assert.equal(Object.isFrozen(left), true);
  assert.equal(Object.isFrozen(left.payload.assessment), true);
});

test("detects assessment tampering", () => {
  const report = createIndustrialValidationReportBinding(
    assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT),
  );
  const tampered = structuredClone(report);
  (tampered.payload.assessment as { decision: string }).decision = "INSUFFICIENT_VALIDATION_EVIDENCE";

  assert.equal(verifyIndustrialValidationReportBinding(tampered), false);
});

test("detects integrity tampering", () => {
  const report = createIndustrialValidationReportBinding(
    assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT),
  );
  const tampered = structuredClone(report);
  (tampered.integrity as { payloadSha256: string }).payloadSha256 = "0".repeat(64);

  assert.equal(verifyIndustrialValidationReportBinding(tampered), false);
});

test("preserves all mandatory prohibited claims", () => {
  const report = createIndustrialValidationReportBinding(
    assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT),
  );

  assert.deepEqual(report.payload.assessment.prohibitedClaims, [
    "VISUAL_EQUALITY_CONFIRMED",
    "SPECTRAL_EQUIVALENCE_CONFIRMED",
    "ROOT_CAUSE_CONFIRMED",
    "RECIPE_APPROVED",
    "PRODUCTION_RELEASE_GRANTED",
  ]);
  assert.match(report.payload.claimBoundary, /does not certify/i);
});
