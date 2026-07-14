import type { MasterRecord, MasterRepository } from "../master";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export type AtlasFitStatus =
  | "REFERENCE_LOCKED"
  | "REFERENCE_UNLOCKED"
  | "TARGET_REFERENCE_NOT_FOUND";

export interface CandidateSpectrum {
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
}

export interface AtlasFitEvidence {
  readonly status: AtlasFitStatus;
  readonly targetReference: string;
  readonly nearestReference?: string;
  readonly targetRank?: number;
  readonly spectralRmse?: number;
  readonly nearestRmse?: number;
  readonly secondNearestRmse?: number;
  readonly lockMargin?: number;
  readonly comparedReferenceCount: number;
  readonly method: "SPECTRAL_RMSE_36_BAND_380_730_10NM";
  readonly limitations: readonly string[];
}

function assertCandidateSpectrum(spectrum: CandidateSpectrum): void {
  if (spectrum.wavelengthsNm.length !== 36 || spectrum.reflectance.length !== 36) {
    throw new Error("Candidate spectrum must contain exactly 36 bands.");
  }

  for (let index = 0; index < 36; index += 1) {
    if (spectrum.wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new Error("Candidate spectrum must use the canonical 380–730 nm / 10 nm grid.");
    }

    const value = spectrum.reflectance[index];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Candidate reflectance[${index}] must be a finite number from 0 to 1.`);
    }
  }
}

function spectralRmse(left: readonly number[], right: readonly number[]): number {
  const meanSquaredError = left.reduce((sum, value, index) => {
    const difference = value - right[index];
    return sum + difference * difference;
  }, 0) / left.length;

  return Math.sqrt(meanSquaredError);
}

function rankRecords(records: readonly MasterRecord[], candidate: CandidateSpectrum) {
  return records
    .map((record) => ({
      record,
      rmse: spectralRmse(candidate.reflectance, record.spectrum.reflectance),
    }))
    .sort(
      (left, right) =>
        left.rmse - right.rmse ||
        left.record.reference.localeCompare(right.record.reference),
    );
}

export async function evaluateAtlasFit(
  repository: MasterRepository,
  targetReference: string,
  candidate: CandidateSpectrum,
): Promise<AtlasFitEvidence> {
  if (!REFERENCE_PATTERN.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }

  assertCandidateSpectrum(candidate);
  const records = await repository.listRecords();
  const target = records.find((record) => record.reference === targetReference);
  const limitations = [
    "No Spectral Scissor performed",
    "No Metamerism Gate performed",
    "No production approval",
  ] as const;

  if (!target) {
    return {
      status: "TARGET_REFERENCE_NOT_FOUND",
      targetReference,
      comparedReferenceCount: records.length,
      method: "SPECTRAL_RMSE_36_BAND_380_730_10NM",
      limitations,
    };
  }

  const ranked = rankRecords(records, candidate);
  const targetIndex = ranked.findIndex(({ record }) => record.reference === targetReference);
  const nearest = ranked[0];
  const secondNearest = ranked[1];
  const targetRmse = ranked[targetIndex].rmse;
  const lockMargin = secondNearest ? secondNearest.rmse - nearest.rmse : undefined;
  const locked = targetIndex === 0 && nearest.record.reference === targetReference;

  return {
    status: locked ? "REFERENCE_LOCKED" : "REFERENCE_UNLOCKED",
    targetReference,
    nearestReference: nearest.record.reference,
    targetRank: targetIndex + 1,
    spectralRmse: targetRmse,
    nearestRmse: nearest.rmse,
    secondNearestRmse: secondNearest?.rmse,
    lockMargin,
    comparedReferenceCount: ranked.length,
    method: "SPECTRAL_RMSE_36_BAND_380_730_10NM",
    limitations,
  };
}
