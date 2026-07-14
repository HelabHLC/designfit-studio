import type { LabColor } from "../reference";
import type { LchAbD50Color } from "./types";

export interface LchAbD50ConversionEvidence {
  readonly lch: LchAbD50Color;
  readonly labD50: LabColor;
  readonly method: "CIELCH_AB_D50_DEGREES_TO_LAB_D50";
}

export function convertLchAbD50ToLabD50(value: LchAbD50Color): LchAbD50ConversionEvidence {
  const radians = value.h * Math.PI / 180;
  return {
    lch: value,
    labD50: {
      l: value.l,
      a: value.c * Math.cos(radians),
      b: value.c * Math.sin(radians),
    },
    method: "CIELCH_AB_D50_DEGREES_TO_LAB_D50",
  };
}
