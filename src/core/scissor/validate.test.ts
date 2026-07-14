import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { validateSpectralScissor } from "./validate";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const targetReflectance = wavelengthsNm.map((_, index) => 0.2 + index * 0.005);
const otherReflectance = wavelengthsNm.map((_, index) => 0.7 - index * 0.004);

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

const records = [
  record("H180_L050_C040", targetReflectance),
  record("H200_L050_C040", otherReflectance),
];

const repository: MasterRepository = {
  async getManifest() {
    return {
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

const baseInput = {
  targetReference: "H180_L050_C040",
  correctedTargetCurve: { wavelengthsNm, reflectance: targetReflectance },
  crossingsBefore: 4,
  crossingsAfter: 0,
  nearestAfterCorrection: "H180_L050_C040",
  deltaDeltaLambdaNm: 0.4,
  allowedLambdaDriftNm: 1,
} as const;

test("locks only when all mandatory conditions pass", async () => {
  const result = await validateSpectralScissor(repository, baseInput);
  assert.equal(result.status, "SCISSOR_LOCKED");
  assert.equal(result.atlasFit?.targetRank, 1);
});

test("unlocks when crossings remain", async () => {
  const result = await validateSpectralScissor(repository, {
    ...baseInput,
    crossingsAfter: 1,
  });
  assert.equal(result.status, "SCISSOR_UNLOCKED");
  assert.equal(result.conditions.noCrossingsAfter, false);
});

test("unlocks when lambda drift exceeds the permitted value", async () => {
  const result = await validateSpectralScissor(repository, {
    ...baseInput,
    deltaDeltaLambdaNm: 1.1,
  });
  assert.equal(result.status, "SCISSOR_UNLOCKED");
  assert.equal(result.conditions.lambdaDriftWithinLimit, false);
});

test("marks malformed evidence invalid", async () => {
  const result = await validateSpectralScissor(repository, {
    ...baseInput,
    crossingsAfter: -1,
  });
  assert.equal(result.status, "SCISSOR_INVALID");
});
