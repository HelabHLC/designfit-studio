import type { LabColor } from "../reference";
import type { HlcD50Color } from "./types";

export interface HlcD50ConversionEvidence {
  readonly hlc: HlcD50Color;
  readonly labD50: LabColor;
  readonly method: "HLC_AB_D50_DEGREES_TO_LAB_D50";
}

export function convertHlcD50ToLabD50(value: HlcD50Color): HlcD50ConversionEvidence {
  const radians = value.h * Math.PI / 180;
  return {
    hlc: value,
    labD50: {
      l: value.l,
      a: value.c * Math.cos(radians),
      b: value.c * Math.sin(radians),
    },
    method: "HLC_AB_D50_DEGREES_TO_LAB_D50",
  };
}
