const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export interface LambdaV2Spectrum {
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
}

export interface LambdaV2Result {
  readonly status: "LAMBDA_V2_COMPUTED";
  readonly lambdaV2Nm: number;
  readonly method: "Brent";
  readonly implementationId: "ARBE_LAMBDA_V2_BRENT_RUNTIME";
  readonly implementationVersion: "1.0.0";
  readonly iterations: number;
  readonly residual: number;
  readonly toleranceNm: number;
}

function assertSpectrum(spectrum: LambdaV2Spectrum): void {
  if (spectrum.wavelengthsNm.length !== 36 || spectrum.reflectance.length !== 36) {
    throw new Error("lambda_V2 spectrum must contain exactly 36 bands.");
  }
  for (let index = 0; index < 36; index += 1) {
    if (spectrum.wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new Error("lambda_V2 spectrum must use the canonical 380–730 nm / 10 nm grid.");
    }
    const value = spectrum.reflectance[index];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`lambda_V2 reflectance[${index}] must be within 0..1.`);
    }
  }
}

function integratePiecewiseLinearUntil(
  wavelengthsNm: readonly number[],
  values: readonly number[],
  x: number,
): number {
  if (x <= wavelengthsNm[0]) return 0;
  const last = wavelengthsNm.length - 1;
  const upper = Math.min(x, wavelengthsNm[last]);
  let area = 0;
  for (let index = 0; index < last; index += 1) {
    const leftX = wavelengthsNm[index];
    const rightX = wavelengthsNm[index + 1];
    if (upper <= leftX) break;
    const segmentEnd = Math.min(upper, rightX);
    const fraction = (segmentEnd - leftX) / (rightX - leftX);
    const endY = values[index] + fraction * (values[index + 1] - values[index]);
    area += 0.5 * (values[index] + endY) * (segmentEnd - leftX);
    if (upper <= rightX) break;
  }
  return area;
}

export function lambdaV2Balance(spectrum: LambdaV2Spectrum, wavelengthNm: number): number {
  assertSpectrum(spectrum);
  const oneMinus = spectrum.reflectance.map((value) => 1 - value);
  const reflectedTotal = integratePiecewiseLinearUntil(
    spectrum.wavelengthsNm,
    spectrum.reflectance,
    spectrum.wavelengthsNm.at(-1)!,
  );
  const absorbedLeft = integratePiecewiseLinearUntil(
    spectrum.wavelengthsNm,
    oneMinus,
    wavelengthNm,
  );
  const reflectedLeft = integratePiecewiseLinearUntil(
    spectrum.wavelengthsNm,
    spectrum.reflectance,
    wavelengthNm,
  );
  return absorbedLeft - (reflectedTotal - reflectedLeft);
}

function brentRoot(
  fn: (x: number) => number,
  lower: number,
  upper: number,
  tolerance: number,
  maxIterations: number,
): { root: number; iterations: number; residual: number } {
  let a = lower;
  let b = upper;
  let fa = fn(a);
  let fb = fn(b);
  if (fa === 0) return { root: a, iterations: 0, residual: 0 };
  if (fb === 0) return { root: b, iterations: 0, residual: 0 };
  if (fa * fb > 0) throw new Error("Brent root is not bracketed on the spectral interval.");

  let c = a;
  let fc = fa;
  let d = b - a;
  let e = d;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    if (fb * fc > 0) {
      c = a;
      fc = fa;
      d = b - a;
      e = d;
    }
    if (Math.abs(fc) < Math.abs(fb)) {
      const oldA = a;
      const oldFa = fa;
      a = b;
      fa = fb;
      b = c;
      fb = fc;
      c = oldA;
      fc = oldFa;
    }

    const midpoint = 0.5 * (c - b);
    const tol = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tolerance;
    if (Math.abs(midpoint) <= tol || fb === 0) {
      return { root: b, iterations: iteration, residual: fb };
    }

    if (Math.abs(e) >= tol && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number;
      let q: number;
      if (a === c) {
        p = 2 * midpoint * s;
        q = 1 - s;
      } else {
        q = fa / fc;
        const r = fb / fc;
        p = s * (2 * midpoint * q * (q - r) - (b - a) * (r - 1));
        q = (q - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q;
      else p = -p;
      const previousE = e;
      e = d;
      if (2 * p < Math.min(3 * midpoint * q - Math.abs(tol * q), Math.abs(previousE * q))) {
        d = p / q;
      } else {
        d = midpoint;
        e = midpoint;
      }
    } else {
      d = midpoint;
      e = midpoint;
    }

    a = b;
    fa = fb;
    b += Math.abs(d) > tol ? d : Math.sign(midpoint) * tol;
    fb = fn(b);
  }
  throw new Error(`Brent root did not converge within ${maxIterations} iterations.`);
}

export function computeLambdaV2(
  spectrum: LambdaV2Spectrum,
  toleranceNm = 1e-10,
  maxIterations = 100,
): LambdaV2Result {
  assertSpectrum(spectrum);
  if (!Number.isFinite(toleranceNm) || toleranceNm <= 0) {
    throw new Error("lambda_V2 toleranceNm must be finite and greater than zero.");
  }
  if (!Number.isInteger(maxIterations) || maxIterations < 1) {
    throw new Error("lambda_V2 maxIterations must be an integer greater than zero.");
  }
  const lower = spectrum.wavelengthsNm[0];
  const upper = spectrum.wavelengthsNm.at(-1)!;
  const solved = brentRoot(
    (wavelengthNm) => lambdaV2Balance(spectrum, wavelengthNm),
    lower,
    upper,
    toleranceNm,
    maxIterations,
  );
  return {
    status: "LAMBDA_V2_COMPUTED",
    lambdaV2Nm: solved.root,
    method: "Brent",
    implementationId: "ARBE_LAMBDA_V2_BRENT_RUNTIME",
    implementationVersion: "1.0.0",
    iterations: solved.iterations,
    residual: solved.residual,
    toleranceNm,
  };
}
