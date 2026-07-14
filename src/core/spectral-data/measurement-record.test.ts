import assert from "node:assert/strict";
import test from "node:test";

import {
  MeasurementRecordError,
  canPublishMeasurementRecord,
  validateMeasurementRecord,
  type SpectralMeasurementRecord,
} from "./measurement-record";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const spectrum = wavelengthsNm.map((_, index) => 0.08 + index * 0.01);

const validRecord: SpectralMeasurementRecord = {
  recordId: "ARBE-MEASURED-2026-0001",
  dataClass: "ARBE_MEASURED",
  manufacturer: "Example Manufacturer",
  productLine: "Example Line",
  productName: "Ultramarine Blue",
  pigmentIndex: ["PB29"],
  measuredAt: "2026-07-14T10:00:00+02:00",
  measuredBy: "ARBE",
  instrument: {
    manufacturer: "Example Instrument Co.",
    model: "Sphere Spectrophotometer",
    geometry: "d/8",
    uvCondition: "UV included",
    apertureMm: 8,
  },
  application: {
    substrate: "standard coated measurement card",
    preparation: "uniform white ground",
    applicationMethod: "drawdown",
    coats: 2,
    dryingTimeHours: 72,
  },
  wavelengthsNm,
  replicates: [spectrum, spectrum, spectrum],
  meanReflectance: spectrum,
  rawFileName: "ARBE-MEASURED-2026-0001.cgats",
  rawFileSha256: "a".repeat(64),
  atlasFitReference: "H275_L035_C060",
  atlasFitMethod: "CIE76 candidate ranking",
};

test("accepts a complete ARBE measured record", () => {
  assert.doesNotThrow(() => validateMeasurementRecord(validRecord));
  assert.equal(canPublishMeasurementRecord(validRecord), true);
});

test("requires at least three replicate measurements", () => {
  assert.throws(
    () => validateMeasurementRecord({ ...validRecord, replicates: [spectrum, spectrum] }),
    MeasurementRecordError,
  );
});

test("rejects a noncanonical spectral grid", () => {
  const invalidGrid = [...wavelengthsNm];
  invalidGrid[1] = 391;
  assert.throws(
    () => validateMeasurementRecord({ ...validRecord, wavelengthsNm: invalidGrid }),
    MeasurementRecordError,
  );
});

test("rejects an invalid AtlasFit reference", () => {
  assert.throws(
    () => validateMeasurementRecord({ ...validRecord, atlasFitReference: "PB29" }),
    MeasurementRecordError,
  );
});
