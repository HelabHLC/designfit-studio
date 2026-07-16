import type { LambdaV2Spectrum } from "../lambda-v2";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export type SpectralWindowId =
  | "W380_430"
  | "W440_490"
  | "W500_550"
  | "W560_610"
  | "W620_670"
  | "W680_730";

export type SpectralWindowDirection =
  | "NO_DIFFERENCE"
  | "CANDIDATE_ABOVE"
  | "CANDIDATE_BELOW"
  | "MIXED";

export interface SpectralWindowEvidence {
  readonly sequence: number;
  readonly windowId: SpectralWindowId;
  readonly startNm: number;
  readonly endNm: number;
  readonly bandCount: 6;
  readonly signedMeanDifference: number;
  readonly meanAbsoluteDifference: number;
  readonly rmse: number;
  readonly integratedAbsoluteDifferenceNm: number;
  readonly maximumAbsoluteDifference: number;
  readonly peakWavelengthNm: number;
  readonly direction: SpectralWindowDirection;
  readonly signChanges: number;
  readonly absoluteDifferenceShare: number;
}

export interface SpectralWindowStructure {
  readonly schemaVersion: "ARBE_SPECTRAL_WINDOW_STRUCTURE_V1";
  readonly targetReference: string;
  readonly method: "FIXED_6_WINDOW_REFLECTANCE_DIFFERENCE_380_730_10NM_V1";
  readonly status: "NO_DIFFERENCE" | "DIFFERENCE_RECORDED";
  readonly windows: readonly SpectralWindowEvidence[];
  readonly dominantWindowId: SpectralWindowId;
  readonly totalIntegratedAbsoluteDifferenceNm: number;
  readonly globalRmse: number;
  readonly globalSignChanges: number;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

const WINDOWS = Object.freeze([
  { windowId: "W380_430", startNm: 380, endNm: 430 },
  { windowId: "W440_490", startNm: 440, endNm: 490 },
  { windowId: "W500_550", startNm: 500, endNm: 550 },
  { windowId: "W560_610", startNm: 560, endNm: 610 },
  { windowId: "W620_670", startNm: 620, endNm: 670 },
  { windowId: "W680_730", startNm: 680, endNm: 730 },
] as const);

function assertSpectrum(spectrum: LambdaV2Spectrum, label: string): void {
  if (spectrum.wavelengthsNm.length !== 36 || spectrum.reflectance.length !== 36) {
    throw new Error(`${label} spectrum must contain exactly 36 bands.`);
  }
  for (let index = 0; index < 36; index += 1) {
    if (spectrum.wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new Error(`${label} spectrum must use the canonical 380–730 nm / 10 nm grid.`);
    }
    const value = spectrum.reflectance[index];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${label} reflectance[${index}] must be within 0..1.`);
    }
  }
}

function integrateTrapezoidal(values: readonly number[], stepNm = 10): number {
  let area = 0;
  for (let index = 0; index < values.length - 1; index += 1) {
    area += 0.5 * (values[index] + values[index + 1]) * stepNm;
  }
  return area;
}

function countSignChanges(values: readonly number[]): number {
  let previousSign = 0;
  let changes = 0;
  for (const value of values) {
    const sign = value > 0 ? 1 : value < 0 ? -1 : 0;
    if (sign === 0) continue;
    if (previousSign !== 0 && sign !== previousSign) changes += 1;
    previousSign = sign;
  }
  return changes;
}

function classifyDirection(values: readonly number[]): SpectralWindowDirection {
  const hasPositive = values.some((value) => value > 0);
  const hasNegative = values.some((value) => value < 0);
  if (!hasPositive && !hasNegative) return "NO_DIFFERENCE";
  if (hasPositive && hasNegative) return "MIXED";
  return hasPositive ? "CANDIDATE_ABOVE" : "CANDIDATE_BELOW";
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createSpectralWindowStructure(
  targetReference: string,
  referenceSpectrum: LambdaV2Spectrum,
  candidateSpectrum: LambdaV2Spectrum,
): SpectralWindowStructure {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  assertSpectrum(referenceSpectrum, "Reference");
  assertSpectrum(candidateSpectrum, "Candidate");

  const differences = candidateSpectrum.reflectance.map(
    (value, index) => value - referenceSpectrum.reflectance[index],
  );
  const absoluteDifferences = differences.map(Math.abs);
  const totalIntegratedAbsoluteDifferenceNm = integrateTrapezoidal(absoluteDifferences);
  const globalRmse = Math.sqrt(
    differences.reduce((sum, value) => sum + value * value, 0) / differences.length,
  );

  const rawWindows = WINDOWS.map((window, sequence) => {
    const startIndex = (window.startNm - 380) / 10;
    const values = differences.slice(startIndex, startIndex + 6);
    const absoluteValues = values.map(Math.abs);
    const maximumAbsoluteDifference = Math.max(...absoluteValues);
    const peakOffset = absoluteValues.indexOf(maximumAbsoluteDifference);
    return {
      sequence: sequence + 1,
      ...window,
      bandCount: 6 as const,
      signedMeanDifference: values.reduce((sum, value) => sum + value, 0) / values.length,
      meanAbsoluteDifference: absoluteValues.reduce((sum, value) => sum + value, 0) / values.length,
      rmse: Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length),
      integratedAbsoluteDifferenceNm: integrateTrapezoidal(absoluteValues),
      maximumAbsoluteDifference,
      peakWavelengthNm: window.startNm + peakOffset * 10,
      direction: classifyDirection(values),
      signChanges: countSignChanges(values),
    };
  });

  const windows: SpectralWindowEvidence[] = rawWindows.map((window) => ({
    ...window,
    absoluteDifferenceShare: totalIntegratedAbsoluteDifferenceNm > 0
      ? window.integratedAbsoluteDifferenceNm / totalIntegratedAbsoluteDifferenceNm
      : 0,
  }));
  const dominantWindow = windows.reduce((current, window) =>
    window.integratedAbsoluteDifferenceNm > current.integratedAbsoluteDifferenceNm
      ? window
      : current,
  );

  return deepFreeze({
    schemaVersion: "ARBE_SPECTRAL_WINDOW_STRUCTURE_V1",
    targetReference,
    method: "FIXED_6_WINDOW_REFLECTANCE_DIFFERENCE_380_730_10NM_V1",
    status: absoluteDifferences.every((value) => value === 0)
      ? "NO_DIFFERENCE"
      : "DIFFERENCE_RECORDED",
    windows,
    dominantWindowId: dominantWindow.windowId,
    totalIntegratedAbsoluteDifferenceNm,
    globalRmse,
    globalSignChanges: countSignChanges(differences),
    claimBoundary: "This structure records local spectral differences against an existing ARBE reference. It does not identify pigment, substrate or process root cause and does not grant production release.",
    limitations: [
      "Window boundaries are fixed analytical partitions and are not universal pigment bands.",
      "No cause is inferred from direction, peak position, crossings or concentration alone.",
      "A recorded local difference does not establish visual difference or production unsuitability.",
    ],
  });
}
