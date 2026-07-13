export function spectralRmse(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("Spectra must have the same non-zero length.");
  }
  const mse = a.reduce((sum, value, index) => {
    const delta = value - b[index];
    return sum + delta * delta;
  }, 0) / a.length;
  return Math.sqrt(mse);
}

export function countSpectralCrossings(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length === 0 || a.length !== b.length) {
    throw new Error("Spectra must have the same non-zero length.");
  }
  let crossings = 0;
  for (let index = 0; index < a.length - 1; index += 1) {
    const current = b[index] - a[index];
    const next = b[index + 1] - a[index + 1];
    if (current === 0 || current * next < 0) crossings += 1;
  }
  return crossings;
}

export function secondDifferenceRoughness(values: readonly number[]): number {
  if (values.length < 3) return 0;
  let sum = 0;
  for (let index = 0; index < values.length - 2; index += 1) {
    const secondDifference = values[index + 2] - 2 * values[index + 1] + values[index];
    sum += secondDifference * secondDifference;
  }
  return Math.sqrt(sum / (values.length - 2));
}
