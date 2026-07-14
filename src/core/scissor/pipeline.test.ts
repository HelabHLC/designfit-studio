import assert from "node:assert/strict";
import test from "node:test";
import type { MasterDatasetManifest, MasterRecord, MasterRepository } from "../master";
import { runSpectralScissorPipeline } from "./pipeline";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function record(reference: string, reflectance: readonly number[]): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "test",
    sourceCxf: "test",
    lab: { l: 50, a: 0, b: 0 },
    spectrum: { wavelengthsNm, reflectance },
  };
}

function repository(records: readonly MasterRecord[]): MasterRepository {
  const manifest: MasterDatasetManifest = {
    datasetId: "test",
    title: "test",
    fileName: "test.jsonl.gz",
    format: "application/x-ndjson+gzip",
    sha256: "0".repeat(64),
    sizeBytes: 1,
    recordCount: records.length,
    identityField: "reference",
    spectralGridNm: wavelengthsNm,
    status: "VERIFIED",
  };
  return {
    async getManifest() { return manifest; },
    async verifySource() {},
    async findByReference(reference) { return records.find((item) => item.reference === reference); },
    async listReferences() { return records.map((item) => item.reference); },
    async listRecords() { return records; },
  };
}

test("runs correction and AtlasFit without issuing a final lock", async () => {
  const target = record("H000_L050_C000", Array(36).fill(0.4));
  const other = record("H010_L050_C010", Array(36).fill(0.8));
  const result = await runSpectralScissorPipeline(
    repository([target, other]),
    target.reference,
    { wavelengthsNm, reflectance: Array(36).fill(0.45) },
  );

  assert.equal(result.status, "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR");
  assert.equal(result.automaticallyDerived?.crossingsAfter, 0);
  assert.equal(result.atlasFit?.nearestReference, target.reference);
  assert.equal(result.descriptorGate, "PENDING_LAMBDA_V2_EVALUATION");
  assert.equal(result.verdict, "NOT_FINAL");
});

test("reports a missing target without fabricating evidence", async () => {
  const result = await runSpectralScissorPipeline(
    repository([]),
    "H000_L050_C000",
    { wavelengthsNm, reflectance: Array(36).fill(0.5) },
  );
  assert.equal(result.status, "TARGET_REFERENCE_NOT_FOUND");
  assert.equal(result.atlasFit, undefined);
});
