import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { validateLambdaV2Conformance } from "./conformance";

const record: MasterRecord = {
  reference: "H180_L050_C040",
  atlasIdentityValid: true,
  lambdaV2Method: "Brent",
  sourceAtlas: "fixture",
  sourceCxf: "fixture",
  lab: { l: 50, a: -10, b: 12 },
  spectrum: {
    wavelengthsNm: Array.from({ length: 36 }, (_, index) => 380 + index * 10),
    reflectance: Array.from({ length: 36 }, () => 0.5),
  },
  lambdaV2Nm: 512.345678,
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
      spectralGridNm: record.spectrum.wavelengthsNm,
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

test("accepts matching Brent descriptor evidence", async () => {
  const result = await validateLambdaV2Conformance(repository, {
    reference: record.reference,
    lambdaV2Nm: 512.345678,
    method: "Brent",
    implementationId: "arbe-lambda-canonical",
    implementationVersion: "1.0.1",
  });
  assert.equal(result.status, "LAMBDA_V2_CONFORMANT");
  assert.equal(result.absoluteErrorNm, 0);
});

test("rejects method mismatch even when value matches", async () => {
  const result = await validateLambdaV2Conformance(repository, {
    reference: record.reference,
    lambdaV2Nm: 512.345678,
    method: "Approximation",
    implementationId: "external-test",
    implementationVersion: "0.1.0",
  });
  assert.equal(result.status, "LAMBDA_V2_NONCONFORMANT");
});

test("rejects descriptor value outside tolerance", async () => {
  const result = await validateLambdaV2Conformance(
    repository,
    {
      reference: record.reference,
      lambdaV2Nm: 512.346,
      method: "Brent",
      implementationId: "arbe-lambda-canonical",
      implementationVersion: "1.0.1",
    },
    { toleranceNm: 1e-6 },
  );
  assert.equal(result.status, "LAMBDA_V2_NONCONFORMANT");
});
