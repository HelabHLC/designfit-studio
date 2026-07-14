import assert from "node:assert/strict";
import test from "node:test";
import { computeLambdaV2, lambdaV2Balance } from "./compute";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function spectrum(reflectance: readonly number[]) {
  return { wavelengthsNm, reflectance };
}

test("returns lower bound for a perfectly absorbing spectrum", () => {
  const result = computeLambdaV2(spectrum(Array(36).fill(0)));
  assert.equal(result.lambdaV2Nm, 380);
  assert.equal(result.method, "Brent");
});

test("returns upper bound for a perfectly reflecting spectrum", () => {
  const result = computeLambdaV2(spectrum(Array(36).fill(1)));
  assert.equal(result.lambdaV2Nm, 730);
});

test("returns interval midpoint for constant 50 percent reflectance", () => {
  const input = spectrum(Array(36).fill(0.5));
  const result = computeLambdaV2(input);
  assert.ok(Math.abs(result.lambdaV2Nm - 555) < 1e-8);
  assert.ok(Math.abs(lambdaV2Balance(input, result.lambdaV2Nm)) < 1e-8);
});

test("matches the energetic area identity for a non-uniform spectrum", () => {
  const reflectance = wavelengthsNm.map((wavelength) => 0.15 + 0.7 * ((wavelength - 380) / 350));
  const result = computeLambdaV2(spectrum(reflectance));
  const expected = 380 + 0.5 * 350 * (reflectance[0] + reflectance.at(-1)!);
  assert.ok(Math.abs(result.lambdaV2Nm - expected) < 1e-8);
  assert.ok(Math.abs(result.residual) < 1e-8);
});

test("rejects non-canonical spectra", () => {
  assert.throws(
    () => computeLambdaV2({ wavelengthsNm: [380], reflectance: [0.5] }),
    /exactly 36 bands/,
  );
});
