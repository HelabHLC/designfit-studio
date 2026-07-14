import type { LabColor } from "../reference";
import type { XyzD50Color, XyzD65Color } from "./types";

const D50 = { x: 0.96422, y: 1, z: 0.82521 } as const;

function xyzToLabComponent(value: number): number {
  const delta = 6 / 29;
  const deltaCubed = delta ** 3;
  return value > deltaCubed
    ? Math.cbrt(value)
    : value / (3 * delta * delta) + 4 / 29;
}

function xyzD50ToLab(xyzD50: XyzD50Color): LabColor {
  const fx = xyzToLabComponent(xyzD50.x / D50.x);
  const fy = xyzToLabComponent(xyzD50.y / D50.y);
  const fz = xyzToLabComponent(xyzD50.z / D50.z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export interface XyzD50LabConversionEvidence {
  readonly xyzD50: XyzD50Color;
  readonly labD50: LabColor;
  readonly method: "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50";
}

export interface XyzD65LabConversionEvidence {
  readonly xyzD65: XyzD65Color;
  readonly xyzD50: XyzD50Color;
  readonly labD50: LabColor;
  readonly method: "CIE_XYZ_D65_RELATIVE_Y1_TO_LAB_D50_BRADFORD";
}

export function convertXyzD50ToLabD50(xyzD50: XyzD50Color): XyzD50LabConversionEvidence {
  return {
    xyzD50,
    labD50: xyzD50ToLab(xyzD50),
    method: "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50",
  };
}

export function convertXyzD65ToLabD50(xyzD65: XyzD65Color): XyzD65LabConversionEvidence {
  const xyzD50 = {
    x: 1.0478112 * xyzD65.x + 0.0228866 * xyzD65.y - 0.050127 * xyzD65.z,
    y: 0.0295424 * xyzD65.x + 0.9904844 * xyzD65.y - 0.0170491 * xyzD65.z,
    z: -0.0092345 * xyzD65.x + 0.0150436 * xyzD65.y + 0.7521316 * xyzD65.z,
  };
  return {
    xyzD65,
    xyzD50,
    labD50: xyzD50ToLab(xyzD50),
    method: "CIE_XYZ_D65_RELATIVE_Y1_TO_LAB_D50_BRADFORD",
  };
}
