import assert from "node:assert/strict";
import test from "node:test";
import { createSpectralMomentDescriptor } from "./moment-descriptor";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function spectrum(reflectance: readonly number[]) {
  return { wavelengthsNm, reflectance };
}

test("computes deterministic delta-lambda, dispersion and standardized skewness", () => {
  const input = spectrum(wavelengthsNm.map(() => 0.5));
  const left = createSpectralMomentDescriptor("H000_L050_C000", input);
  const right = createSpectralMomentDescriptor("H000_L050_C000", input);

  assert.deepEqual(left, right);
  assert.ok(Math.abs(left.lambdaEeNm - 555) < 1e-10);
  assert.ok(Math.abs(left.lambdaV2Nm - 555) < 1e-8);
  assert.ok(Math.abs(left.deltaLambdaStarNm) < 1e-8);
  assert.ok(left.mu2Nm2 > 0);
  assert.ok(Math.abs(left.sigmaNm ** 2 - left.mu2Nm2) < 1e-8);
  assert.ok(Math.abs(left.mu3Standardized) < 1e-12);
  assert.equal(left.skewDirection, "SYMMETRIC");
});

test("reports the direction of an asymmetric reflectance distribution", () => {
  const longwaveWeighted = createSpectralMomentDescriptor(
    "H030_L050_C040",
    spectrum(wavelengthsNm.map((wavelength) => (wavelength - 370) / 370)),
  );
  const shortwaveWeighted = createSpectralMomentDescriptor(
    "H240_L050_C040",
    spectrum(wavelengthsNm.map((wavelength) => (740 - wavelength) / 370)),
  );

  assert.equal(longwaveWeighted.skewDirection, "SHORTWAVE");
  assert.equal(shortwaveWeighted.skewDirection, "LONGWAVE");
  assert.ok(longwaveWeighted.mu3Standardized < 0);
  assert.ok(shortwaveWeighted.mu3Standardized > 0);
});

test("rejects invalid references and spectra without reflected energy", () => {
  assert.throws(
    () => createSpectralMomentDescriptor("#336699", spectrum(wavelengthsNm.map(() => 0.5))),
    /Hxxx_Lxxx_Cxxx/,
  );
  assert.throws(
    () => createSpectralMomentDescriptor("H000_L050_C000", spectrum(wavelengthsNm.map(() => 0))),
    /denominator must be greater than zero/,
  );
});

test("returns deeply frozen descriptor objects", () => {
  const descriptor = createSpectralMomentDescriptor(
    "H000_L050_C000",
    spectrum(wavelengthsNm.map(() => 0.5)),
  );
  assert.equal(Object.isFrozen(descriptor), true);
  assert.equal(Object.isFrozen(descriptor.limitations), true);
});
