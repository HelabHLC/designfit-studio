const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export interface ScissorSpectrum {
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
}

export interface ScissorV03Options {
  readonly epsilon?: number;
  readonly smoothSigmaBands?: number;
  readonly smoothRadius?: number;
}

export interface ScissorV03Result {
  readonly status: "SCISSOR_CANDIDATE_COMPUTED";
  readonly method: "ARBE_SPECTRAL_SCISSOR_V03_SMOOTH_PROJECTED_CLAMP";
  readonly epsilon: number;
  readonly smoothSigmaBands: number;
  readonly smoothKernelRadius: number;
  readonly crossingsBefore: number;
  readonly crossingsAfter: number;
  readonly crossingPositionsNm: readonly number[];
  readonly correctionRmse: number;
  readonly correctionMaxAbs: number;
  readonly correctionRoughness: number;
  readonly physicalRangeStatus: "OK_REFLECTANCE_RANGE" | "REVIEW_OUT_OF_REFLECTANCE_RANGE";
  readonly correctedSpectrum: ScissorSpectrum;
  readonly correction: readonly number[];
  readonly deltaOriginal: readonly number[];
  readonly deltaCorrected: readonly number[];
  readonly verdict: "SCISSOR_CANDIDATE";
  readonly limitations: readonly string[];
}

function assertSpectrum(spectrum: ScissorSpectrum, label: string): void {
  if (spectrum.wavelengthsNm.length !== 36 || spectrum.reflectance.length !== 36) {
    throw new Error(`${label} must contain exactly 36 spectral bands.`);
  }
  for (let index = 0; index < 36; index += 1) {
    if (spectrum.wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new Error(`${label} must use the canonical 380–730 nm / 10 nm grid.`);
    }
    const value = spectrum.reflectance[index];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${label} reflectance[${index}] must be within 0..1.`);
    }
  }
}

function gaussianKernel(sigma: number, radius?: number): readonly number[] {
  if (!Number.isFinite(sigma) || sigma <= 0) {
    throw new Error("smoothSigmaBands must be finite and greater than zero.");
  }
  const resolvedRadius = radius ?? Math.max(1, Math.ceil(3 * sigma));
  if (!Number.isInteger(resolvedRadius) || resolvedRadius < 1) {
    throw new Error("smoothRadius must be an integer greater than or equal to 1.");
  }
  const raw = Array.from({ length: resolvedRadius * 2 + 1 }, (_, index) => {
    const x = index - resolvedRadius;
    return Math.exp(-(x * x) / (2 * sigma * sigma));
  });
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

function smoothEdgePadded(values: readonly number[], kernel: readonly number[]): number[] {
  const radius = Math.floor(kernel.length / 2);
  return values.map((_, index) =>
    kernel.reduce((sum, weight, kernelIndex) => {
      const sourceIndex = Math.min(
        values.length - 1,
        Math.max(0, index + kernelIndex - radius),
      );
      return sum + values[sourceIndex] * weight;
    }, 0),
  );
}

function crossingPositions(
  wavelengthsNm: readonly number[],
  delta: readonly number[],
): readonly number[] {
  const positions: number[] = [];
  for (let index = 0; index < delta.length - 1; index += 1) {
    const left = delta[index];
    const right = delta[index + 1];
    if (left === 0) positions.push(wavelengthsNm[index]);
    if ((left < 0 && right > 0) || (left > 0 && right < 0)) {
      const fraction = Math.abs(left) / (Math.abs(left) + Math.abs(right));
      positions.push(
        wavelengthsNm[index] +
          fraction * (wavelengthsNm[index + 1] - wavelengthsNm[index]),
      );
    }
  }
  if (delta.at(-1) === 0) positions.push(wavelengthsNm.at(-1)!);
  return positions;
}

function roughnessSecondDifference(values: readonly number[]): number {
  if (values.length < 3) return 0;
  const secondDifferences = values.slice(0, -2).map(
    (value, index) => values[index + 2] - 2 * values[index + 1] + value,
  );
  return Math.sqrt(
    secondDifferences.reduce((sum, value) => sum + value * value, 0) /
      secondDifferences.length,
  );
}

export function runSpectralScissorV03(
  referenceA: ScissorSpectrum,
  referenceB: ScissorSpectrum,
  options: ScissorV03Options = {},
): ScissorV03Result {
  assertSpectrum(referenceA, "referenceA");
  assertSpectrum(referenceB, "referenceB");

  const epsilon = options.epsilon ?? 2e-4;
  if (!Number.isFinite(epsilon) || epsilon <= 0) {
    throw new Error("epsilon must be finite and greater than zero.");
  }
  const smoothSigmaBands = options.smoothSigmaBands ?? 1;
  const kernel = gaussianKernel(smoothSigmaBands, options.smoothRadius);
  const smoothKernelRadius = Math.floor(kernel.length / 2);

  const deltaOriginal = referenceB.reflectance.map(
    (value, index) => value - referenceA.reflectance[index],
  );
  const positions = crossingPositions(referenceA.wavelengthsNm, deltaOriginal);
  const requiredCorrection = deltaOriginal.map((value) => Math.max(epsilon - value, 0));
  const smoothedCorrection = smoothEdgePadded(requiredCorrection, kernel).map((value) =>
    Math.max(value, 0),
  );
  const correction = smoothedCorrection.map((value, index) =>
    Math.max(value, requiredCorrection[index]),
  );
  const correctedReflectance = referenceB.reflectance.map(
    (value, index) => value + correction[index],
  );
  const deltaCorrected = correctedReflectance.map(
    (value, index) => value - referenceA.reflectance[index],
  );
  const crossingsAfter = crossingPositions(referenceA.wavelengthsNm, deltaCorrected).length;
  const correctionRmse = Math.sqrt(
    correction.reduce((sum, value) => sum + value * value, 0) / correction.length,
  );
  const correctionMaxAbs = Math.max(...correction.map(Math.abs));
  const physicalRangeStatus = correctedReflectance.some((value) => value < 0 || value > 1)
    ? "REVIEW_OUT_OF_REFLECTANCE_RANGE"
    : "OK_REFLECTANCE_RANGE";

  return {
    status: "SCISSOR_CANDIDATE_COMPUTED",
    method: "ARBE_SPECTRAL_SCISSOR_V03_SMOOTH_PROJECTED_CLAMP",
    epsilon,
    smoothSigmaBands,
    smoothKernelRadius,
    crossingsBefore: positions.length,
    crossingsAfter,
    crossingPositionsNm: positions,
    correctionRmse,
    correctionMaxAbs,
    correctionRoughness: roughnessSecondDifference(correction),
    physicalRangeStatus,
    correctedSpectrum: {
      wavelengthsNm: EXPECTED_WAVELENGTHS,
      reflectance: correctedReflectance,
    },
    correction,
    deltaOriginal,
    deltaCorrected,
    verdict: "SCISSOR_CANDIDATE",
    limitations: [
      "This is the deterministic v0.3 smooth projected-clamp candidate, not the v0.4 constrained optimizer.",
      "No CIE D50/2° colour-preservation constraint has been evaluated.",
      "No lambda drift has been calculated.",
      "The corrected curve must still pass the mandatory Spectral Scissor validation gate.",
      "No second recipe solution or Metamerism Gate has been performed.",
      "Not a production approval.",
    ],
  };
}
