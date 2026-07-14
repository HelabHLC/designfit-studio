import type { ExtractedPalette, PaletteExtractionOptions, PaletteSwatch, Rgb8 } from "./types";

type Pixel = readonly [number, number, number];

interface Box {
  readonly pixels: readonly Pixel[];
}

function assertByte(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(`${label} must be an integer in [0, 255]`);
  }
}

function toHex(rgb: Rgb8): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function channelRange(pixels: readonly Pixel[], channel: 0 | 1 | 2): number {
  let min = 255;
  let max = 0;
  for (const pixel of pixels) {
    min = Math.min(min, pixel[channel]);
    max = Math.max(max, pixel[channel]);
  }
  return max - min;
}

function splitChannel(pixels: readonly Pixel[]): 0 | 1 | 2 {
  const ranges = [channelRange(pixels, 0), channelRange(pixels, 1), channelRange(pixels, 2)] as const;
  let best: 0 | 1 | 2 = 0;
  if (ranges[1] > ranges[best]) best = 1;
  if (ranges[2] > ranges[best]) best = 2;
  return best;
}

function splitBox(box: Box): readonly [Box, Box] | undefined {
  if (box.pixels.length < 2) return undefined;
  const channel = splitChannel(box.pixels);
  const sorted = [...box.pixels].sort((a, b) =>
    a[channel] - b[channel] || a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  );
  const middle = Math.floor(sorted.length / 2);
  if (middle === 0 || middle === sorted.length) return undefined;
  return [{ pixels: sorted.slice(0, middle) }, { pixels: sorted.slice(middle) }];
}

function average(pixels: readonly Pixel[]): Rgb8 {
  const totals = pixels.reduce(
    (sum, pixel) => [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]] as [number, number, number],
    [0, 0, 0] as [number, number, number],
  );
  return totals.map((value) => Math.round(value / pixels.length)) as unknown as Rgb8;
}

export function extractPaletteFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  options: PaletteExtractionOptions = {},
): ExtractedPalette {
  if (rgba.length % 4 !== 0) throw new RangeError("RGBA input length must be divisible by 4");
  const maxColors = options.maxColors ?? 6;
  const alphaThreshold = options.alphaThreshold ?? 1;
  if (!Number.isInteger(maxColors) || maxColors < 1 || maxColors > 32) {
    throw new RangeError("maxColors must be an integer in [1, 32]");
  }
  assertByte(alphaThreshold, "alphaThreshold");

  const pixels: Pixel[] = [];
  for (let index = 0; index < rgba.length; index += 4) {
    if (rgba[index + 3] < alphaThreshold) continue;
    pixels.push([rgba[index], rgba[index + 1], rgba[index + 2]]);
  }
  if (pixels.length === 0) throw new RangeError("No visible pixels available for palette extraction");

  const boxes: Box[] = [{ pixels }];
  while (boxes.length < maxColors) {
    let candidateIndex = -1;
    let candidateScore = -1;
    for (let index = 0; index < boxes.length; index += 1) {
      const box = boxes[index];
      const score = Math.max(channelRange(box.pixels, 0), channelRange(box.pixels, 1), channelRange(box.pixels, 2)) * box.pixels.length;
      if (box.pixels.length > 1 && score > candidateScore) {
        candidateIndex = index;
        candidateScore = score;
      }
    }
    if (candidateIndex < 0) break;
    const split = splitBox(boxes[candidateIndex]);
    if (!split) break;
    boxes.splice(candidateIndex, 1, ...split);
  }

  const total = pixels.length;
  const swatches: PaletteSwatch[] = boxes
    .map((box) => {
      const rgb = average(box.pixels);
      return { rgb, hex: toHex(rgb), population: box.pixels.length, share: box.pixels.length / total };
    })
    .sort((a, b) => b.population - a.population || a.hex.localeCompare(b.hex));

  return {
    swatches,
    sampledPixelCount: total,
    method: "DETERMINISTIC_MEDIAN_CUT_V1",
    status: "PALETTE_CANDIDATE",
  };
}
