import type { LabColor } from "../reference";
import type { XyzD50Color } from "./types";

const D50 = { x: 0.96422, y: 1, z: 0.82521 } as const;

function xyzToLabComponent(value: number): number {
  const delta = 6 / 29;
  const deltaCubed = delta ** 3;
  return value > deltaCubed
    ? Math.cbrt(value)
    : value / (3 * delta * delta) + 4 / 29;
}

export interface XyzD50LabConversionEvidence {
  readonly xyzD50: XyzD50Color;
  readonly labD50: LabColor;
  readonly method: "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50";
}

export function convertXyzD50ToLabD50(xyzD50: XyzD50Color): XyzD50LabConversionEvidence {
  const fx = xyzToLabComponent(xyzD50.x / D50.x);
  const fy = xyzToLabComponent(xyzD50.y / D50.y);
  const fz = xyzToLabComponent(xyzD50.z / D50.z);

  return {
    xyzD50,
    labD50: {
      l: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    },
    method: "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50",
  };
}
