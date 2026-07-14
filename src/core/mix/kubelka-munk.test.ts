import assert from "node:assert/strict";
import test from "node:test";

import {
  ksToReflectance,
  mixReflectanceKm,
  normalizeWeights,
  reflectanceToKs,
} from "./kubelka-munk";

const close = (actual: number, expected: number, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("K/S conversion round-trips reflectance", () => {
  for (const reflectance of [0.05, 0.2, 0.5, 0.9]) {
    close(ksToReflectance(reflectanceToKs(reflectance)), reflectance);
  }
});

test("normalizes non-negative weights", () => {
  assert.deepEqual(normalizeWeights([2, 1, 1]), [0.5, 0.25, 0.25]);
  assert.deepEqual(normalizeWeights([0, 0]), [0.5, 0.5]);
});

test("identical spectra remain unchanged after mixing", () => {
  const spectrum = [0.1, 0.25, 0.5, 0.8];
  const result = mixReflectanceKm([spectrum, spectrum], [0.2, 0.8]);
  result.forEach((value, index) => close(value, spectrum[index]));
});
