import assert from "node:assert/strict";
import test from "node:test";
import { extractPaletteFromRgba } from "./median-cut";

test("extracts a deterministic two-colour palette", () => {
  const rgba = new Uint8ClampedArray([
    255, 0, 0, 255,
    255, 0, 0, 255,
    0, 0, 255, 255,
    0, 0, 255, 255,
  ]);

  const result = extractPaletteFromRgba(rgba, { maxColors: 2 });
  assert.equal(result.status, "PALETTE_CANDIDATE");
  assert.equal(result.method, "DETERMINISTIC_MEDIAN_CUT_V1");
  assert.equal(result.sampledPixelCount, 4);
  assert.deepEqual(result.swatches.map((swatch) => swatch.hex), ["#0000FF", "#FF0000"]);
  assert.deepEqual(result.swatches.map((swatch) => swatch.share), [0.5, 0.5]);
});

test("ignores pixels below the alpha threshold", () => {
  const rgba = new Uint8ClampedArray([
    10, 20, 30, 255,
    200, 210, 220, 0,
  ]);

  const result = extractPaletteFromRgba(rgba, { maxColors: 4, alphaThreshold: 1 });
  assert.equal(result.sampledPixelCount, 1);
  assert.equal(result.swatches.length, 1);
  assert.equal(result.swatches[0].hex, "#0A141E");
});

test("rejects malformed or empty visible input", () => {
  assert.throws(() => extractPaletteFromRgba(new Uint8Array([0, 0, 0])), /divisible by 4/);
  assert.throws(
    () => extractPaletteFromRgba(new Uint8Array([10, 20, 30, 0])),
    /No visible pixels/,
  );
});
