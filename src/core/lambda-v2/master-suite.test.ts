import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runLambdaV2MasterSuite } from "./master-suite";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function makeRecord(reference: string, expected: number): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l: 50, a: 0, b: 0 },
    spectrum: { wavelengthsNm, reflectance: Array.from({ length: 36 }, () => 0.5) },
    lambdaV2Nm: expected,
  };
}

function makeRepository(records: readonly MasterRecord[]): MasterRepository {
  return {
    async getManifest() {
      return {
        datasetId: "fixture",
        title: "fixture",
        fileName: "fixture.jsonl.gz",
        format: "application/x-ndjson+gzip",
        sha256: "a".repeat(64),
        sizeBytes: 1,
        recordCount: records.length,
        identityField: "reference",
        spectralGridNm: wavelengthsNm,
        status: "VERIFIED",
      };
    },
    async verifySource() {},
    async findByReference(reference) {
      return records.find((record) => record.reference === reference);
    },
    async listReferences() {
      return records.map((record) => record.reference);
    },
    async listRecords() {
      return records;
    },
  };
}

test("reports full-master conformance when every eligible record matches", async () => {
  const repository = makeRepository([
    makeRecord("H000_L050_C000", 555),
    makeRecord("H180_L050_C040", 555),
  ]);
  const result = await runLambdaV2MasterSuite(repository, { maxReferences: 10 });
  assert.equal(result.status, "LAMBDA_V2_MASTER_SUITE_CONFORMANT");
  assert.equal(result.coverage, "FULL_MASTER");
  assert.equal(result.nonconformantReferences, 0);
});

test("reports nonconformance when a master value differs", async () => {
  const repository = makeRepository([
    makeRecord("H000_L050_C000", 555),
    makeRecord("H180_L050_C040", 554),
  ]);
  const result = await runLambdaV2MasterSuite(repository, { maxReferences: 10 });
  assert.equal(result.status, "LAMBDA_V2_MASTER_SUITE_NONCONFORMANT");
  assert.equal(result.nonconformantReferences, 1);
});

test("marks deterministic limited runs as sampled coverage", async () => {
  const repository = makeRepository([
    makeRecord("H000_L050_C000", 555),
    makeRecord("H090_L050_C040", 555),
    makeRecord("H180_L050_C040", 555),
  ]);
  const result = await runLambdaV2MasterSuite(repository, { maxReferences: 2 });
  assert.equal(result.coverage, "DETERMINISTIC_STRATIFIED_SAMPLE");
  assert.equal(result.testedReferences, 2);
});
