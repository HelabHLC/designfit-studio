import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { evaluateAtlasFit } from "./evaluate";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function record(reference: string, reflectanceValue: number): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l: 50, a: 0, b: 0 },
    spectrum: {
      wavelengthsNm,
      reflectance: wavelengthsNm.map(() => reflectanceValue),
    },
  };
}

function repository(records: readonly MasterRecord[]): MasterRepository {
  return {
    async getManifest() {
      return {
        datasetId: "fixture",
        title: "Fixture",
        fileName: "fixture.jsonl.gz",
        format: "application/x-ndjson+gzip" as const,
        sha256: "0".repeat(64),
        sizeBytes: 1,
        recordCount: records.length,
        identityField: "reference" as const,
        spectralGridNm: wavelengthsNm,
        status: "VERIFIED" as const,
      };
    },
    async verifySource() {},
    async findByReference(reference) {
      return records.find((item) => item.reference === reference);
    },
    async listReferences() {
      return records.map((item) => item.reference);
    },
    async listRecords() {
      return records;
    },
  };
}

const records = [
  record("H000_L050_C000", 0.2),
  record("H120_L050_C040", 0.5),
  record("H240_L050_C040", 0.8),
];

test("locks only when the target is the nearest Master reference", async () => {
  const result = await evaluateAtlasFit(repository(records), "H120_L050_C040", {
    wavelengthsNm,
    reflectance: wavelengthsNm.map(() => 0.49),
  });

  assert.equal(result.status, "REFERENCE_LOCKED");
  assert.equal(result.nearestReference, "H120_L050_C040");
  assert.equal(result.targetRank, 1);
  assert.ok((result.lockMargin ?? 0) > 0);
});

test("reports unlocked when another reference is nearer", async () => {
  const result = await evaluateAtlasFit(repository(records), "H120_L050_C040", {
    wavelengthsNm,
    reflectance: wavelengthsNm.map(() => 0.79),
  });

  assert.equal(result.status, "REFERENCE_UNLOCKED");
  assert.equal(result.nearestReference, "H240_L050_C040");
  assert.equal(result.targetRank, 2);
});

test("reports a missing target without inventing a lock", async () => {
  const result = await evaluateAtlasFit(repository(records), "H300_L050_C040", {
    wavelengthsNm,
    reflectance: wavelengthsNm.map(() => 0.5),
  });

  assert.equal(result.status, "TARGET_REFERENCE_NOT_FOUND");
  assert.equal(result.targetRank, undefined);
});

test("rejects a non-canonical candidate spectrum", async () => {
  await assert.rejects(
    evaluateAtlasFit(repository(records), "H120_L050_C040", {
      wavelengthsNm: [381, ...wavelengthsNm.slice(1)],
      reflectance: wavelengthsNm.map(() => 0.5),
    }),
    /canonical 380–730 nm/,
  );
});
