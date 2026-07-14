import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyStructuralDrift,
  computeLambdaEeCentroid,
  computeStructuralDrift,
} from "./structural-drift";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

test("computes lambda_EE centroid for a constant spectrum", () => {
  const result = computeLambdaEeCentroid({
    wavelengthsNm,
    reflectance: Array.from({ length: 36 }, () => 0.5),
  });
  assert.ok(Math.abs(result - 555) < 1e-10);
});

test("computes delta-delta-lambda against the Master descriptor", () => {
  const result = computeStructuralDrift(
    {
      wavelengthsNm,
      reflectance: Array.from({ length: 36 }, () => 0.5),
    },
    0,
  );
  assert.ok(Math.abs(result.lambdaV2Nm - 555) < 1e-8);
  assert.ok(Math.abs(result.deltaDeltaLambdaNm) < 1e-8);
  assert.equal(result.driftStatus, "STABLE");
});

test("uses the normative structural drift bands", () => {
  assert.equal(classifyStructuralDrift(5), "STABLE");
  assert.equal(classifyStructuralDrift(7), "WATCH");
  assert.equal(classifyStructuralDrift(15), "REVIEW");
  assert.equal(classifyStructuralDrift(21), "BLOCK");
});
