import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runSpectralScissorLockPipeline } from "./lock-pipeline";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const reflectance = Array.from({ length: 36 }, () => 0.5);
const record: MasterRecord = {
  reference: "H180_L050_C040",
  atlasIdentityValid: true,
  lambdaV2Method: "Brent",
  sourceAtlas: "fixture",
  sourceCxf: "fixture",
  lab: { l: 50, a: 0, b: 0 },
  spectrum: { wavelengthsNm, reflectance },
  lambdaV2Nm: 555,
  lambdaEeNm: 555,
  deltaLambdaNm: 0,
};

const repository: MasterRepository = {
  async getManifest() {
    return {
      datasetId: "fixture",
      title: "fixture",
      fileName: "fixture.jsonl.gz",
      format: "application/x-ndjson+gzip",
      sha256: "a".repeat(64),
      sizeBytes: 1,
      recordCount: 1,
      identityField: "reference",
      spectralGridNm: wavelengthsNm,
      status: "VERIFIED",
    };
  },
  async verifySource() {},
  async findByReference(reference) {
    return reference === record.reference ? record : undefined;
  },
  async listReferences() {
    return [record.reference];
  },
  async listRecords() {
    return [record];
  },
};

test("issues SCISSOR_LOCKED only after computed structural drift passes", async () => {
  const result = await runSpectralScissorLockPipeline(
    repository,
    record.reference,
    { wavelengthsNm, reflectance },
    { allowedLambdaDriftNm: 5 },
  );
  assert.equal(result.status, "SCISSOR_LOCKED");
  assert.equal(result.validation?.conditions.noCrossingsAfter, true);
  assert.equal(result.validation?.conditions.nearestReferencePreserved, true);
  assert.equal(result.validation?.conditions.lambdaDriftWithinLimit, true);
  assert.equal(result.structuralDrift?.driftStatus, "STABLE");
});

test("does not lock when the Master structural descriptor is unavailable", async () => {
  const { deltaLambdaNm: _omitted, ...withoutDeltaLambda } = record;
  const incomplete: MasterRecord = withoutDeltaLambda;
  const incompleteRepository: MasterRepository = {
    ...repository,
    async findByReference(reference) {
      return reference === incomplete.reference ? incomplete : undefined;
    },
  };
  const result = await runSpectralScissorLockPipeline(
    incompleteRepository,
    record.reference,
    { wavelengthsNm, reflectance },
    { allowedLambdaDriftNm: 5 },
  );
  assert.equal(result.status, "MASTER_STRUCTURAL_DESCRIPTOR_UNAVAILABLE");
  assert.equal(result.verdict, "NOT_FINAL");
});
