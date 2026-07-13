import assert from "node:assert/strict";
import test from "node:test";

import { CgatsImportError, importCgatsSpectralDataset } from "./cgats-importer";

const fixture = `CGATS.17
ORIGINATOR freieFarbe e.V
NUMBER_OF_FIELDS 4
BEGIN_DATA_FORMAT
SAMPLE_NAME SPECTRAL_NM_380 SPECTRAL_NM_390 SPECTRAL_NM_400
END_DATA_FORMAT
NUMBER_OF_SETS 2
BEGIN_DATA
H000_L095_C000 0.3736 0.4342 0.5491
H005_L085_C010 0.2794 0.3221 0.4083
END_DATA`;

const metadata = {
  datasetId: "freiefarbe-hlc-atlas-xl-spectral-v1-2",
  title: "freieFarbe HLC Colour Atlas XL Spectral Data",
  version: "1.2",
  releasedAt: "2019-01-30",
  source: "HLC-Colour-Atlas-XL_SpectralData_CGATS_v1-2.txt",
  license: "CC-BY-ND-4.0",
  checksum: "7ed2a376dc1a338cae6d2d4eadb99cd7d20c124e32a4806fb5892649b6cf8114",
  illuminant: "D50",
  observer: "2°",
} as const;

test("imports a versioned CGATS spectral dataset", () => {
  const dataset = importCgatsSpectralDataset(fixture, { metadata });

  assert.equal(dataset.metadata.recordCount, 2);
  assert.equal(dataset.records[0].atlasId, "H000_L095_C000");
  assert.equal(dataset.records[0].lab.l, 95);
  assert.equal(dataset.records[0].spectrum?.wavelengthsNm.length, 3);
  assert.deepEqual(dataset.records[0].spectrum?.reflectance, [0.3736, 0.4342, 0.5491]);
});

test("rejects an incorrect official record count", () => {
  assert.throws(
    () => importCgatsSpectralDataset(fixture, {
      metadata: { ...metadata, recordCount: 13283 },
    }),
    CgatsImportError,
  );
});

test("rejects duplicate atlas identities", () => {
  const duplicate = fixture.replace(
    "H005_L085_C010 0.2794 0.3221 0.4083",
    "H000_L095_C000 0.2794 0.3221 0.4083",
  );

  assert.throws(
    () => importCgatsSpectralDataset(duplicate, { metadata }),
    CgatsImportError,
  );
});
