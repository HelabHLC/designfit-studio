import { computeLambdaV2, type LambdaV2Spectrum } from "../lambda-v2";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export interface SpectralMomentDescriptor {
  readonly schemaVersion: "ARBE_SPECTRAL_MOMENT_DESCRIPTOR_V1";
  readonly targetReference: string;
  readonly lambdaV2Nm: number;
  readonly lambdaEeNm: number;
  readonly deltaLambdaStarNm: number;
  readonly mu2Nm2: number;
  readonly sigmaNm: number;
  readonly mu3Standardized: number;
  readonly skewDirection: "SHORTWAVE" | "SYMMETRIC" | "LONGWAVE";
  readonly method: "REFLECTANCE_WEIGHTED_CONTINUOUS_CENTRAL_MOMENTS_TRAPEZOIDAL_V1";
  readonly lambdaV2Method: "Brent";
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

function assertSpectrum(spectrum: LambdaV2Spectrum): void {
  if (spectrum.wavelengthsNm.length !== spectrum.reflectance.length) {
    throw new Error("Moment descriptor wavelength and reflectance arrays must have equal length.");
  }
  if (spectrum.wavelengthsNm.length < 2) {
    throw new Error("Moment descriptor requires at least two spectral samples.");
  }
  for (let index = 0; index < spectrum.wavelengthsNm.length; index += 1) {
    const wavelength = spectrum.wavelengthsNm[index];
    const reflectance = spectrum.reflectance[index];
    if (!Number.isFinite(wavelength) || (index > 0 && wavelength <= spectrum.wavelengthsNm[index - 1])) {
      throw new Error("Moment descriptor wavelengths must be finite and strictly increasing.");
    }
    if (!Number.isFinite(reflectance) || reflectance < 0 || reflectance > 1) {
      throw new Error(`Moment descriptor reflectance[${index}] must be within 0..1.`);
    }
  }
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

function reflectanceWeightedMoment(
  spectrum: LambdaV2Spectrum,
  centerNm: number,
  order: 1 | 2 | 3,
  denominator: number,
): number {
  const weighted = spectrum.reflectance.map(
    (reflectance, index) => reflectance * ((spectrum.wavelengthsNm[index] - centerNm) ** order),
  );
  return integrateTrapezoidal(spectrum.wavelengthsNm, weighted) / denominator;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createSpectralMomentDescriptor(
  targetReference: string,
  spectrum: LambdaV2Spectrum,
): SpectralMomentDescriptor {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  assertSpectrum(spectrum);

  const denominator = integrateTrapezoidal(spectrum.wavelengthsNm, spectrum.reflectance);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new Error("Spectral moment denominator must be greater than zero.");
  }

  const lambdaEeNm = integrateTrapezoidal(
    spectrum.wavelengthsNm,
    spectrum.reflectance.map((reflectance, index) => reflectance * spectrum.wavelengthsNm[index]),
  ) / denominator;
  const lambdaV2 = computeLambdaV2(spectrum);
  const mu2Nm2 = reflectanceWeightedMoment(spectrum, lambdaEeNm, 2, denominator);
  if (!Number.isFinite(mu2Nm2) || mu2Nm2 <= 0) {
    throw new Error("Spectral dispersion mu2 must be finite and greater than zero.");
  }
  const rawMu3Nm3 = reflectanceWeightedMoment(spectrum, lambdaEeNm, 3, denominator);
  const mu3Standardized = rawMu3Nm3 / (mu2Nm2 ** 1.5);
  const skewDirection = Math.abs(mu3Standardized) <= 1e-12
    ? "SYMMETRIC"
    : mu3Standardized < 0 ? "SHORTWAVE" : "LONGWAVE";

  return deepFreeze({
    schemaVersion: "ARBE_SPECTRAL_MOMENT_DESCRIPTOR_V1",
    targetReference,
    lambdaV2Nm: lambdaV2.lambdaV2Nm,
    lambdaEeNm,
    deltaLambdaStarNm: lambdaV2.lambdaV2Nm - lambdaEeNm,
    mu2Nm2,
    sigmaNm: Math.sqrt(mu2Nm2),
    mu3Standardized,
    skewDirection,
    method: "REFLECTANCE_WEIGHTED_CONTINUOUS_CENTRAL_MOMENTS_TRAPEZOIDAL_V1",
    lambdaV2Method: lambdaV2.method,
    claimBoundary: "The descriptor records atlas-bound spectral structure. It does not identify pigment, substrate, recipe suitability or production authority.",
    limitations: [
      "Moments are reflectance-weighted over the supplied spectral interval.",
      "mu2 is reported in nm²; sigma is reported in nm; mu3 is standardized and dimensionless.",
      "Descriptor similarity does not establish spectral equivalence or visual identity.",
      "Not a production approval.",
    ],
  });
}
