import { computeLambdaV2, type LambdaV2Spectrum } from "../lambda-v2";

export type StructuralDriftStatus = "STABLE" | "WATCH" | "REVIEW" | "BLOCK";

export interface StructuralDriftEvidence {
  readonly lambdaV2Nm: number;
  readonly lambdaEeNm: number;
  readonly deltaLambdaNm: number;
  readonly masterDeltaLambdaNm: number;
  readonly deltaDeltaLambdaNm: number;
  readonly driftStatus: StructuralDriftStatus;
  readonly method: "ARBE_STRUCTURAL_DRIFT_V04";
  readonly lambdaV2Method: "Brent";
}

function integrateTrapezoidal(
  wavelengthsNm: readonly number[],
  values: readonly number[],
): number {
  let area = 0;
  for (let index = 0; index < wavelengthsNm.length - 1; index += 1) {
    const width = wavelengthsNm[index + 1] - wavelengthsNm[index];
    area += 0.5 * (values[index] + values[index + 1]) * width;
  }
  return area;
}

export function computeLambdaEeCentroid(spectrum: LambdaV2Spectrum): number {
  if (spectrum.wavelengthsNm.length !== spectrum.reflectance.length) {
    throw new Error("lambda_EE wavelength and reflectance arrays must have equal length.");
  }
  const denominator = integrateTrapezoidal(spectrum.wavelengthsNm, spectrum.reflectance);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new Error("lambda_EE denominator must be greater than zero.");
  }
  const weighted = spectrum.reflectance.map(
    (value, index) => value * spectrum.wavelengthsNm[index],
  );
  return integrateTrapezoidal(spectrum.wavelengthsNm, weighted) / denominator;
}

export function classifyStructuralDrift(absDeltaDeltaLambdaNm: number): StructuralDriftStatus {
  if (!Number.isFinite(absDeltaDeltaLambdaNm) || absDeltaDeltaLambdaNm < 0) {
    throw new Error("Absolute delta-delta-lambda drift must be finite and non-negative.");
  }
  if (absDeltaDeltaLambdaNm <= 5) return "STABLE";
  if (absDeltaDeltaLambdaNm <= 10) return "WATCH";
  if (absDeltaDeltaLambdaNm <= 20) return "REVIEW";
  return "BLOCK";
}

export function computeStructuralDrift(
  spectrum: LambdaV2Spectrum,
  masterDeltaLambdaNm: number,
): StructuralDriftEvidence {
  if (!Number.isFinite(masterDeltaLambdaNm)) {
    throw new Error("Master delta-lambda must be finite.");
  }
  const lambdaV2 = computeLambdaV2(spectrum);
  const lambdaEeNm = computeLambdaEeCentroid(spectrum);
  const deltaLambdaNm = lambdaV2.lambdaV2Nm - lambdaEeNm;
  const deltaDeltaLambdaNm = deltaLambdaNm - masterDeltaLambdaNm;
  return {
    lambdaV2Nm: lambdaV2.lambdaV2Nm,
    lambdaEeNm,
    deltaLambdaNm,
    masterDeltaLambdaNm,
    deltaDeltaLambdaNm,
    driftStatus: classifyStructuralDrift(Math.abs(deltaDeltaLambdaNm)),
    method: "ARBE_STRUCTURAL_DRIFT_V04",
    lambdaV2Method: lambdaV2.method,
  };
}
