import type { LabColor } from "../reference";

export interface SrgbLabConversionEvidence {
  readonly hex?: string;
  readonly rgb8: readonly [number, number, number];
  readonly xyzD65: readonly [number, number, number];
  readonly xyzD50: readonly [number, number, number];
  readonly labD50: LabColor;
  readonly method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD";
}

const D50 = [0.96422, 1, 0.82521] as const;

function decodeSrgb(channel8: number): number {
  const encoded = channel8 / 255;
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

function parseHex(hex: string): readonly [number, number, number] {
  const normalized = hex.trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) {
    throw new Error("HEX request must match #RRGGBB.");
  }
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function validateRgb8(rgb8: readonly [number, number, number]): void {
  if (!rgb8.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
    throw new Error("sRGB8 channels must be integers between 0 and 255.");
  }
}

function xyzToLabComponent(value: number): number {
  const delta = 6 / 29;
  const deltaCubed = delta ** 3;
  return value > deltaCubed
    ? Math.cbrt(value)
    : value / (3 * delta * delta) + 4 / 29;
}

export function convertSrgb8ToLabD50(
  rgb8: readonly [number, number, number],
  hex?: string,
): SrgbLabConversionEvidence {
  validateRgb8(rgb8);
  const [r, g, b] = rgb8.map(decodeSrgb) as [number, number, number];

  const xyzD65 = [
    0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    0.0193339 * r + 0.119192 * g + 0.9503041 * b,
  ] as const;

  const xyzD50 = [
    1.0478112 * xyzD65[0] + 0.0228866 * xyzD65[1] - 0.050127 * xyzD65[2],
    0.0295424 * xyzD65[0] + 0.9904844 * xyzD65[1] - 0.0170491 * xyzD65[2],
    -0.0092345 * xyzD65[0] + 0.0150436 * xyzD65[1] + 0.7521316 * xyzD65[2],
  ] as const;

  const fx = xyzToLabComponent(xyzD50[0] / D50[0]);
  const fy = xyzToLabComponent(xyzD50[1] / D50[1]);
  const fz = xyzToLabComponent(xyzD50[2] / D50[2]);

  return {
    hex,
    rgb8,
    xyzD65,
    xyzD50,
    labD50: {
      l: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    },
    method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD",
  };
}

export function convertHexToLabD50(hex: string): SrgbLabConversionEvidence {
  const normalized = hex.trim().toUpperCase();
  return convertSrgb8ToLabD50(parseHex(normalized), normalized);
}
