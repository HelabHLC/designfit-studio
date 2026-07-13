export function clampReflectance(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Reflectance must be finite.");
  return Math.min(0.9999, Math.max(0.0001, value));
}

export function reflectanceToKs(reflectance: number): number {
  const r = clampReflectance(reflectance);
  return ((1 - r) ** 2) / (2 * r);
}

export function ksToReflectance(ks: number): number {
  if (!Number.isFinite(ks) || ks < 0) throw new Error("K/S must be finite and non-negative.");
  return Math.min(1, Math.max(0.0001, 1 + ks - Math.sqrt(ks * ks + 2 * ks)));
}

export function normalizeWeights(weights: readonly number[]): number[] {
  if (weights.length === 0) throw new Error("At least one weight is required.");
  const cleaned = weights.map((weight) => {
    if (!Number.isFinite(weight)) throw new Error("Weights must be finite.");
    return Math.max(0, weight);
  });
  const total = cleaned.reduce((sum, value) => sum + value, 0);
  if (total === 0) return cleaned.map(() => 1 / cleaned.length);
  return cleaned.map((value) => value / total);
}

export function mixReflectanceKm(
  spectra: readonly (readonly number[])[],
  weights: readonly number[],
): number[] {
  if (spectra.length === 0) throw new Error("At least one spectrum is required.");
  if (spectra.length !== weights.length) throw new Error("Spectrum and weight counts differ.");
  const length = spectra[0].length;
  if (length === 0 || spectra.some((spectrum) => spectrum.length !== length)) {
    throw new Error("All spectra must share one non-empty wavelength grid.");
  }

  const normalized = normalizeWeights(weights);
  return Array.from({ length }, (_, index) => {
    const mixedKs = spectra.reduce(
      (sum, spectrum, spectrumIndex) =>
        sum + normalized[spectrumIndex] * reflectanceToKs(spectrum[index]),
      0,
    );
    return ksToReflectance(mixedKs);
  });
}
