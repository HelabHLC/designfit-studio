import assert from "node:assert/strict";
import test from "node:test";
import { runSpectralScissorV03 } from "./correct-v03";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function spectrum(reflectance: readonly number[]) {
  return { wavelengthsNm, reflectance } as const;
}

test("removes alternating crossings with the projected clamp", () => {
  const a = spectrum(Array.from({ length: 36 }, () => 0.4));
  const b = spectrum(Array.from({ length: 36 }, (_, index) => 0.4 + (index % 2 === 0 ? -0.01 : 0.01)));

  const result = runSpectralScissorV03(a, b, {
    epsilon: 0.0002,
    smoothSigmaBands: 1,
  });

  assert.equal(result.status, "SCISSOR_CANDIDATE_COMPUTED");
  assert.ok(result.crossingsBefore > 0);
  assert.equal(result.crossingsAfter, 0);
  assert.ok(result.deltaCorrected.every((value) => value >= 0.0002 - 1e-12));
  assert.equal(result.physicalRangeStatus, "OK_REFLECTANCE_RANGE");
  assert.equal(result.verdict, "SCISSOR_CANDIDATE");
});

test("does not change a curve already above the safety margin", () => {
  const a = spectrum(Array.from({ length: 36 }, () => 0.25));
  const b = spectrum(Array.from({ length: 36 }, () => 0.5));

  const result = runSpectralScissorV03(a, b);

  assert.equal(result.crossingsBefore, 0);
  assert.equal(result.crossingsAfter, 0);
  assert.equal(result.correctionMaxAbs, 0);
  assert.deepEqual(result.correctedSpectrum.reflectance, b.reflectance);
});

test("reports an out-of-range candidate instead of silently clipping", () => {
  const a = spectrum(Array.from({ length: 36 }, () => 1));
  const b = spectrum(Array.from({ length: 36 }, () => 0.9999));

  const result = runSpectralScissorV03(a, b, { epsilon: 0.001 });

  assert.equal(result.physicalRangeStatus, "REVIEW_OUT_OF_REFLECTANCE_RANGE");
  assert.ok(result.correctedSpectrum.reflectance.some((value) => value > 1));
});

test("rejects a non-canonical grid", () => {
  assert.throws(
    () =>
      runSpectralScissorV03(
        { wavelengthsNm: wavelengthsNm.map((value, index) => index === 0 ? 381 : value), reflectance: Array(36).fill(0.2) },
        spectrum(Array(36).fill(0.3)),
      ),
    /canonical/,
  );
});
