import assert from "node:assert/strict";
import test from "node:test";
import { assessIndustrialValidation } from "./industrial-validation-contract";
import { COMPLETE_INDUSTRIAL_VALIDATION_INPUT } from "./fixtures";

test("complete evidence is ready for technical review", () => {
  const result = assessIndustrialValidation(COMPLETE_INDUSTRIAL_VALIDATION_INPUT);
  assert.equal(result.decision, "READY_FOR_TECHNICAL_REVIEW");
  assert.equal(result.issues.length, 0);
  assert.equal(result.targetReference, "H005_L070_C030");
  assert.ok(result.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED"));
  assert.ok(Object.isFrozen(result));
});

test("undocumented calibration remains an explicit caution", () => {
  const source = COMPLETE_INDUSTRIAL_VALIDATION_INPUT;
  const result = assessIndustrialValidation({
    ...source,
    measurement: { ...source.measurement, calibrationStatus: "NOT_DOCUMENTED" },
  });
  assert.equal(result.decision, "READY_FOR_TECHNICAL_REVIEW");
  assert.equal(result.issues[0]?.code, "CALIBRATION_NOT_DOCUMENTED");
  assert.equal(result.issues[0]?.severity, "CAUTION");
});

test("non-canonical identity blocks validation readiness", () => {
  const result = assessIndustrialValidation({
    ...COMPLETE_INDUSTRIAL_VALIDATION_INPUT,
    targetReference: "HEX_E097A8",
  });
  assert.equal(result.decision, "INSUFFICIENT_VALIDATION_EVIDENCE");
  assert.equal(result.issues[0]?.code, "INVALID_REFERENCE");
});

test("missing provenance blocks validation readiness", () => {
  const source = COMPLETE_INDUSTRIAL_VALIDATION_INPUT;
  const result = assessIndustrialValidation({
    ...source,
    provenance: { ...source.provenance, datasetId: " " },
  });
  assert.equal(result.decision, "INSUFFICIENT_VALIDATION_EVIDENCE");
  assert.ok(result.issues.some((item) => item.code === "INCOMPLETE_PROVENANCE"));
});
