export type SpectralDataClass =
  | "OPEN_REFERENCE"
  | "ARBE_MEASURED"
  | "RESTRICTED_INTERNAL";

export interface MeasurementInstrument {
  readonly manufacturer: string;
  readonly model: string;
  readonly serialNumber?: string;
  readonly geometry: string;
  readonly uvCondition?: string;
  readonly apertureMm?: number;
  readonly calibrationReference?: string;
  readonly calibrationTimestamp?: string;
}

export interface MeasurementApplication {
  readonly substrate: string;
  readonly substrateBatch?: string;
  readonly preparation: string;
  readonly applicationMethod: string;
  readonly wetFilmThicknessUm?: number;
  readonly dryFilmThicknessUm?: number;
  readonly coats: number;
  readonly dryingTimeHours: number;
  readonly environmentalNotes?: string;
}

export interface SpectralMeasurementRecord {
  readonly recordId: string;
  readonly dataClass: SpectralDataClass;
  readonly manufacturer: string;
  readonly productLine: string;
  readonly productName: string;
  readonly articleNumber?: string;
  readonly batchNumber?: string;
  readonly pigmentIndex?: readonly string[];
  readonly measuredAt: string;
  readonly measuredBy: string;
  readonly instrument: MeasurementInstrument;
  readonly application: MeasurementApplication;
  readonly wavelengthsNm: readonly number[];
  readonly replicates: readonly (readonly number[])[];
  readonly meanReflectance: readonly number[];
  readonly rawFileName: string;
  readonly rawFileSha256: string;
  readonly notes?: string;
  readonly atlasFitReference?: string;
  readonly atlasFitMethod?: string;
  readonly atlasFitDistance?: number;
}

const EXPECTED_WAVELENGTHS = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const RECORD_ID_PATTERN = /^ARBE-MEASURED-\d{4}-\d{4}$/;
const ATLAS_ID_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export class MeasurementRecordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeasurementRecordError";
  }
}

function assertReflectance(values: readonly number[], label: string): void {
  if (values.length !== EXPECTED_WAVELENGTHS.length) {
    throw new MeasurementRecordError(`${label} must contain exactly 36 values.`);
  }
  values.forEach((value, index) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new MeasurementRecordError(
        `${label} contains invalid reflectance at ${EXPECTED_WAVELENGTHS[index]} nm.`,
      );
    }
  });
}

export function validateMeasurementRecord(record: SpectralMeasurementRecord): void {
  if (!RECORD_ID_PATTERN.test(record.recordId)) {
    throw new MeasurementRecordError("recordId must match ARBE-MEASURED-YYYY-NNNN.");
  }
  if (record.dataClass !== "ARBE_MEASURED") {
    throw new MeasurementRecordError("Measured records must use dataClass ARBE_MEASURED.");
  }
  if (record.wavelengthsNm.length !== EXPECTED_WAVELENGTHS.length) {
    throw new MeasurementRecordError("wavelengthsNm must contain exactly 36 values.");
  }
  record.wavelengthsNm.forEach((value, index) => {
    if (value !== EXPECTED_WAVELENGTHS[index]) {
      throw new MeasurementRecordError("wavelengthsNm must equal 380..730 nm in 10 nm steps.");
    }
  });
  if (record.replicates.length < 3) {
    throw new MeasurementRecordError("At least three replicate measurements are required.");
  }
  record.replicates.forEach((values, index) => assertReflectance(values, `replicate ${index + 1}`));
  assertReflectance(record.meanReflectance, "meanReflectance");
  if (!SHA256_PATTERN.test(record.rawFileSha256)) {
    throw new MeasurementRecordError("rawFileSha256 must be a 64-character SHA-256 value.");
  }
  if (record.application.coats < 1) {
    throw new MeasurementRecordError("application.coats must be at least 1.");
  }
  if (record.application.dryingTimeHours < 0) {
    throw new MeasurementRecordError("application.dryingTimeHours must not be negative.");
  }
  if (record.atlasFitReference && !ATLAS_ID_PATTERN.test(record.atlasFitReference)) {
    throw new MeasurementRecordError("atlasFitReference must be a canonical HLC atlas ID.");
  }
}

export function canPublishMeasurementRecord(record: SpectralMeasurementRecord): boolean {
  validateMeasurementRecord(record);
  return record.dataClass !== "RESTRICTED_INTERNAL";
}
