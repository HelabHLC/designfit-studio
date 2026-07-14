import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runReferenceGateway } from "./gateway";
import { convertHexToLabD50 } from "./srgb-lab";

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

test("converts sRGB white to approximately Lab D50 white", () => {
  const result = convertHexToLabD50("#ffffff");
  assert.equal(result.hex, "#FFFFFF");
  assert.ok(Math.abs(result.labD50.l - 100) < 0.02);
  assert.ok(Math.abs(result.labD50.a) < 0.03);
  assert.ok(Math.abs(result.labD50.b) < 0.03);
});

test("binds HEX through explicit sRGB-to-Lab evidence", async () => {
  const result = await runReferenceGateway(repository, { kind: "HEX", value: "#FFFFFF" });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H000_L100_C000");
  assert.equal(result.bindingMethod, "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH");
  assert.equal(result.conversionEvidence?.method, "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD");
  assert.equal(result.request.identityRule, "REQUEST_ONLY");
});

test("rejects malformed HEX", () => {
  assert.throws(() => convertHexToLabD50("#FFF"), /#RRGGBB/);
});
