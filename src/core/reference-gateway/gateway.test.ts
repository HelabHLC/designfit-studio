import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runReferenceGateway } from "./gateway";
import { normalizeReferenceRequest } from "./normalize";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const records: MasterRecord[] = [
  {
    reference: "H000_L050_C000",
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l: 50, a: 0, b: 0 },
    spectrum: { wavelengthsNm, reflectance: Array.from({ length: 36 }, () => 0.5) },
  },
  {
    reference: "H180_L050_C040",
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l: 50, a: -20, b: -20 },
    spectrum: { wavelengthsNm, reflectance: Array.from({ length: 36 }, () => 0.4) },
  },
];

const repository: MasterRepository = {
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

test("normalizes HEX without promoting it to identity", () => {
  const result = normalizeReferenceRequest({ kind: "HEX", value: "a1b2c3" });
  assert.deepEqual(result, { kind: "HEX", value: "#A1B2C3", identityRule: "REQUEST_ONLY" });
});

test("binds an existing direct ARBE reference", async () => {
  const result = await runReferenceGateway(repository, {
    kind: "REFERENCE",
    value: "h000_l050_c000",
  });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H000_L050_C000");
  assert.equal(result.bindingMethod, "DIRECT_REFERENCE");
});

test("binds Lab requests through ranked Master candidates", async () => {
  const result = await runReferenceGateway(repository, {
    kind: "LAB",
    value: { l: 50, a: -19, b: -21 },
  });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H180_L050_C040");
  assert.equal(result.candidates[0]?.rank, 1);
  assert.equal(result.bindingMethod, "LAB_CIE76_MASTER_SEARCH");
});

test("binds normalized HEX requests through deterministic sRGB-to-Lab routing", async () => {
  const result = await runReferenceGateway(repository, {
    kind: "HEX",
    value: "#777777",
  });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H000_L050_C000");
  assert.equal(result.bindingMethod, "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH");
  assert.equal(result.request.identityRule, "REQUEST_ONLY");
  assert.equal(result.candidates[0]?.rank, 1);
});
