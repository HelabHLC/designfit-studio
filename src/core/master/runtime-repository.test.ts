import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  RuntimeMasterFormatError,
  RuntimeMasterRepository,
  type RuntimeMasterManifest,
} from "./runtime-repository";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function makeRecord(reference: string) {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "HLC Colour Atlas XL",
    sourceCxf: "fixture",
    lab: { l: 50, a: 12, b: -8 },
    spectrum: {
      wavelengthsNm: [...wavelengthsNm],
      reflectance: wavelengthsNm.map((_, index) => 0.2 + index / 100),
    },
  };
}

function fixture(records = [makeRecord("H180_L050_C040")]) {
  const payload = gzipSync(records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  const manifest: RuntimeMasterManifest = {
    datasetId: "fixture-runtime-master",
    title: "Fixture runtime master",
    fileName: "fixture.jsonl.gz",
    format: "application/x-ndjson+gzip",
    sha256: createHash("sha256").update(payload).digest("hex"),
    sizeBytes: payload.byteLength,
    recordCount: records.length,
    identityField: "reference",
    spectralGridNm: [...wavelengthsNm],
    status: "VERIFIED",
  };
  return { payload, manifest };
}

test("loads a checksum-verified gzip JSONL runtime export", async () => {
  const { payload, manifest } = fixture();
  const repository = RuntimeMasterRepository.fromGzipJsonl(payload, manifest);

  await repository.verifySource();
  assert.equal((await repository.findByReference("H180_L050_C040"))?.reference, "H180_L050_C040");
  assert.deepEqual(await repository.listReferences(), ["H180_L050_C040"]);
});

test("rejects a payload with the wrong checksum", () => {
  const { payload, manifest } = fixture();
  const invalidManifest = { ...manifest, sha256: "0".repeat(64) };

  assert.throws(
    () => RuntimeMasterRepository.fromGzipJsonl(payload, invalidManifest),
    RuntimeMasterFormatError,
  );
});

test("rejects duplicate atlas identities", () => {
  const record = makeRecord("H180_L050_C040");
  const { payload, manifest } = fixture([record, record]);

  assert.throws(
    () => RuntimeMasterRepository.fromGzipJsonl(payload, manifest),
    /duplicate reference/,
  );
});

test("rejects non-canonical spectral grids", () => {
  const record = makeRecord("H180_L050_C040");
  record.spectrum.wavelengthsNm[0] = 381;
  const { payload, manifest } = fixture([record]);

  assert.throws(
    () => RuntimeMasterRepository.fromGzipJsonl(payload, manifest),
    /invalid wavelength grid/,
  );
});