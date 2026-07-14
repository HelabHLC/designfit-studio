import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runReferenceGateway } from "./gateway";
import { convertHlcD50ToLabD50 } from "./lch-lab";

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
  record("H000_L050_C040", 50, 40, 0),
  record("H090_L050_C040", 50, 0, 40),
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

test("converts HLC hue 0 degrees to positive a axis", () => {
  const result = convertHlcD50ToLabD50({ h: 0, l: 50, c: 40 });
  assert.equal(result.labD50.l, 50);
  assert.ok(Math.abs(result.labD50.a - 40) < 1e-12);
  assert.ok(Math.abs(result.labD50.b) < 1e-12);
});

test("converts HLC hue 90 degrees to positive b axis", () => {
  const result = convertHlcD50ToLabD50({ h: 90, l: 50, c: 40 });
  assert.ok(Math.abs(result.labD50.a) < 1e-12);
  assert.ok(Math.abs(result.labD50.b - 40) < 1e-12);
});

test("binds HLC D50 through explicit Lab evidence", async () => {
  const result = await runReferenceGateway(repository, {
    kind: "HLC_D50",
    value: { h: 90, l: 50, c: 40 },
  });
  assert.equal(result.status, "REFERENCE_BOUND");
  assert.equal(result.boundReference, "H090_L050_C040");
  assert.equal(result.bindingMethod, "HLC_D50_TO_LAB_D50_CIE76_MASTER_SEARCH");
  assert.equal(result.conversionEvidence?.method, "HLC_AB_D50_DEGREES_TO_LAB_D50");
  assert.equal(result.request.identityRule, "REQUEST_ONLY");
});

test("rejects negative chroma and hue angle 360", async () => {
  await assert.rejects(
    () => runReferenceGateway(repository, { kind: "HLC_D50", value: { h: 0, l: 50, c: -1 } }),
    /chroma must be nonnegative/,
  );
  await assert.rejects(
    () => runReferenceGateway(repository, { kind: "HLC_D50", value: { h: 360, l: 50, c: 40 } }),
    /0 inclusive to 360 exclusive/,
  );
});
