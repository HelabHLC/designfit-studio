import assert from "node:assert/strict";
import test from "node:test";
import { createSpectralWindowStructure } from "./window-structure";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const spectrum = (reflectance: readonly number[]) => ({ wavelengthsNm, reflectance });

test("records no difference deterministically for identical spectra", () => {
  const reference = spectrum(wavelengthsNm.map(() => 0.5));
  const left = createSpectralWindowStructure("H000_L050_C000", reference, reference);
  const right = createSpectralWindowStructure("H000_L050_C000", reference, reference);

  assert.deepEqual(left, right);
  assert.equal(left.status, "NO_DIFFERENCE");
  assert.equal(left.windows.length, 6);
  assert.equal(left.globalRmse, 0);
  assert.equal(left.globalSignChanges, 0);
  assert.ok(left.windows.every((window) => window.direction === "NO_DIFFERENCE"));
});

test("locates a local positive deviation in the correct fixed window", () => {
  const reference = spectrum(wavelengthsNm.map(() => 0.4));
  const candidate = spectrum(wavelengthsNm.map((wavelength) =>
    wavelength >= 560 && wavelength <= 610 ? 0.55 : 0.4,
  ));
  const result = createSpectralWindowStructure("H060_L050_C040", reference, candidate);

  assert.equal(result.status, "DIFFERENCE_RECORDED");
  assert.equal(result.dominantWindowId, "W560_610");
  const target = result.windows.find((window) => window.windowId === "W560_610")!;
  assert.equal(target.direction, "CANDIDATE_ABOVE");
  assert.ok(Math.abs(target.signedMeanDifference - 0.15) < 1e-12);
  assert.ok(target.absoluteDifferenceShare > 0.99);
  assert.equal(target.peakWavelengthNm, 560);
});

test("records mixed local structure and sign changes", () => {
  const reference = spectrum(wavelengthsNm.map(() => 0.5));
  const candidate = spectrum(wavelengthsNm.map((wavelength) => {
    if (wavelength < 620 || wavelength > 670) return 0.5;
    return wavelength % 20 === 0 ? 0.6 : 0.4;
  }));
  const result = createSpectralWindowStructure("H000_L050_C000", reference, candidate);
  const target = result.windows.find((window) => window.windowId === "W620_670")!;

  assert.equal(target.direction, "MIXED");
  assert.equal(target.signChanges, 5);
  assert.equal(result.globalSignChanges, 5);
});

test("rejects invalid references, grids and reflectance values", () => {
  const valid = spectrum(wavelengthsNm.map(() => 0.5));
  assert.throws(
    () => createSpectralWindowStructure("#336699", valid, valid),
    /Hxxx_Lxxx_Cxxx/,
  );
  assert.throws(
    () => createSpectralWindowStructure(
      "H000_L050_C000",
      { wavelengthsNm: [...wavelengthsNm.slice(0, 35), 731], reflectance: wavelengthsNm.map(() => 0.5) },
      valid,
    ),
    /canonical 380–730 nm/,
  );
  assert.throws(
    () => createSpectralWindowStructure(
      "H000_L050_C000",
      valid,
      spectrum(wavelengthsNm.map((_, index) => index === 4 ? 1.1 : 0.5)),
    ),
    /within 0..1/,
  );
});

test("returns deeply frozen window structures", () => {
  const result = createSpectralWindowStructure(
    "H000_L050_C000",
    spectrum(wavelengthsNm.map(() => 0.4)),
    spectrum(wavelengthsNm.map(() => 0.5)),
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.windows), true);
  assert.equal(Object.isFrozen(result.windows[0]), true);
  assert.equal(Object.isFrozen(result.limitations), true);
});
