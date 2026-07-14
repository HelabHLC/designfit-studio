import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { runFinalMixLock } from "./orchestrator";

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

test("runs the full reference-lock sequence to a low-metamerism final verdict", async () => {
  const result = await runFinalMixLock(
    repository,
    record.reference,
    [
      {
        id: "fixture-pigment",
        spectrum: { wavelengthsNm, reflectance },
        weight: 1,
      },
    ],
    [
      { illuminant: "D50", deltaE00: 0.2 },
      { illuminant: "D65", deltaE00: 0.4 },
    ],
    {
      allowedLambdaDriftNm: 5,
      metamerismThresholds: { warningDeltaE00: 1, riskDeltaE00: 2 },
    },
  );

  assert.equal(result.status, "REFERENCE_LOCKED_METAMERISM_LOW");
  assert.equal(result.scissor.status, "SCISSOR_LOCKED");
  assert.equal(result.secondRecipe?.atlasFit.targetRank, 1);
  assert.equal(result.metamerism?.maximumIlluminant, "D65");
  assert.equal(result.finalVerdict, "FINAL_REFERENCE_LOCK");
});
