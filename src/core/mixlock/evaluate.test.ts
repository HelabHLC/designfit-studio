import assert from "node:assert/strict";
import test from "node:test";
import { evaluateMixLockCandidate } from "./evaluate";
import type { MasterRecord, MasterRepository } from "../master";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function record(reference: string, reflectance: number): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l: 50, a: 0, b: 0 },
    spectrum: { wavelengthsNm, reflectance: wavelengthsNm.map(() => reflectance) },
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

test("creates a normalized recipe candidate and AtlasFit evidence", async () => {
  const result = await evaluateMixLockCandidate(
    repository([record("H000_L050_C000", 0.4), record("H000_L060_C000", 0.7)]),
    "H000_L050_C000",
    [
      { id: "P1", weight: 3, spectrum: { wavelengthsNm, reflectance: wavelengthsNm.map(() => 0.4) } },
      { id: "P2", weight: 1, spectrum: { wavelengthsNm, reflectance: wavelengthsNm.map(() => 0.4) } },
    ],
  );

  assert.equal(result.verdict, "RECIPE_CANDIDATE");
  assert.deepEqual(result.recipe.map((item) => item.normalizedWeight), [0.75, 0.25]);
  assert.equal(result.atlasFit.status, "REFERENCE_LOCKED");
});

test("rejects an all-zero recipe", async () => {
  await assert.rejects(
    evaluateMixLockCandidate(repository([record("H000_L050_C000", 0.4)]), "H000_L050_C000", [
      { id: "P1", weight: 0, spectrum: { wavelengthsNm, reflectance: wavelengthsNm.map(() => 0.4) } },
    ]),
    /greater than zero/,
  );
});
