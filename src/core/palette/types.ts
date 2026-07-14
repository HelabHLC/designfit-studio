export type Rgb8 = readonly [number, number, number];

export interface PaletteSwatch {
  readonly rgb: Rgb8;
  readonly hex: string;
  readonly population: number;
  readonly share: number;
}

export interface ExtractedPalette {
  readonly swatches: readonly PaletteSwatch[];
  readonly sampledPixelCount: number;
  readonly method: "DETERMINISTIC_MEDIAN_CUT_V1";
  readonly status: "PALETTE_CANDIDATE";
}

export interface PaletteExtractionOptions {
  readonly maxColors?: number;
  readonly alphaThreshold?: number;
}
