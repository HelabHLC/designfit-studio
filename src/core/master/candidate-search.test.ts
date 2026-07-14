import assert from "node:assert/strict";
import test from "node:test";
import { findMasterCandidates } from "./candidate-search";
import type { MasterRecord, MasterRepository } from "./types";

function record(reference: string, l: number, a: number, b: number): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l, a, b },
    spectrum: {
      wavelengthsNm: Array.from({ length: 36 }, (_, index) => 380 + index * 10),
      reflectance: Array.from({ length: 36 }, () => 0.5),
    },
  };
}

function repository(records: readonly MasterRecord[]): MasterRepository {
  return {
    async getManifest() {
      return {
        datasetId: "fixture",
        title: "fixture",
        fileName: "fixture.jsonl.gz",
        format: "application/x-ndjson+gzip" as const,
        sha256: "0".repeat(64),
        sizeBytes: 0,
        recordCount: records.length,
        identityField: "reference" as const,
        spectralGridNm: Array.from({ length: 36 }, (_, index) => 380 + index * 10),
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

test("ranks Master records by CIE76 distance", async () => {
  const results = await findMasterCandidates(
    repository([
      record("H000_L050_C000", 50, 0, 0),
      record("H010_L050_C010", 50, 2, 0),
      record("H020_L050_C020", 50, 5, 0),
    ]),
    { l: 50, a: 1, b: 0 },
    { limit: 2 },
  );

  assert.deepEqual(results.map((candidate) => candidate.reference), [
    "H000_L050_C000",
    "H010_L050_C010",
  ]);
  assert.deepEqual(results.map((candidate) => candidate.rank), [1, 2]);
  assert.equal(results[0].method, "CIE76");
});

test("rejects non-finite Lab and excessive limits", async () => {
  const source = repository([record("H000_L050_C000", 50, 0, 0)]);
  await assert.rejects(() => findMasterCandidates(source, { l: Number.NaN, a: 0, b: 0 }));
  await assert.rejects(() => findMasterCandidates(source, { l: 50, a: 0, b: 0 }, { limit: 51 }));
});
