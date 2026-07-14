import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runReferenceGateway } from "./gateway";
import { convertXyzD50ToLabD50 } from "./xyz-lab";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);

function record(reference: string, l: number, a: number, b: number): MasterRecord {
  return {
    reference,
    atlasIdentityValid: true,
    lambdaV2Method: "Brent",
    sourceAtlas: "fixture",
    sourceCxf: "fixture",
    lab: { l, a, b },
    spectrum: { wavelengthsNm, reflectance: Array.from({ length: 36 }, () => 0.5) },
  };
}

const records = [
  record("H000_L100_C000", 100, 0, 0),
  record("H000_L000_C000", 0, 0, 0),
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
    return records.find((item) => item.reference === reference);
  },
  async listReferences() {
    return records.map((item) => item.reference);
  },
  async listRecords() {
    return records;
  },
};

test("converts relative XYZ D50 white to Lab D50 white", () => {
  const result = convertXyzD50ToLabD50({ x: 0.96422, y: 1, z: 0.82521 });
  assert.ok(Math.abs(result.labD50.l - 100) < 1e-10);
  assert.ok(Math.abs(result.labD50.a) < 1e-10);
  assert.ok(Math.abs(result.labD50.b) < 1e-10);
});

test("binds XYZ D50 through explicit conversion evidence", async () => {
  const result = await runReferenceGateway(repository, {
    kind: "XYZ_D50",
    value: { x: 0.96422, y: 1, z: 0.82521 },
  });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H000_L100_C000");
  assert.equal(result.bindingMethod, "XYZ_D50_TO_LAB_D50_CIE76_MASTER_SEARCH");
  assert.equal(result.conversionEvidence?.sourceSpace, "CIE_XYZ_D50_RELATIVE_Y1");
  assert.equal(result.conversionEvidence?.method, "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50");
  assert.equal(result.request.identityRule, "REQUEST_ONLY");
});

test("rejects negative XYZ D50 components", async () => {
  await assert.rejects(
    runReferenceGateway(repository, { kind: "XYZ_D50", value: { x: -0.1, y: 0.5, z: 0.2 } }),
    /nonnegative/,
  );
});

test("rejects non-finite XYZ D50 components", async () => {
  await assert.rejects(
    runReferenceGateway(repository, { kind: "XYZ_D50", value: { x: Number.NaN, y: 0.5, z: 0.2 } }),
    /finite numbers/,
  );
});
