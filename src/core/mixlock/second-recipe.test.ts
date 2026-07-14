import assert from "node:assert/strict";
import test from "node:test";
import type { MasterRecord, MasterRepository } from "../master";
import { solveSecondRecipe } from "./second-recipe";

const wavelengthsNm = Array.from({ length: 36 }, (_, index) => 380 + index * 10);
const dark = Array.from({ length: 36 }, () => 0.2);
const light = Array.from({ length: 36 }, () => 0.8);
const targetReflectance = Array.from({ length: 36 }, () => 0.5);

const record: MasterRecord = {
  reference: "H000_L050_C000",
  atlasIdentityValid: true,
  lambdaV2Method: "Brent",
  sourceAtlas: "fixture",
  sourceCxf: "fixture",
  lab: { l: 50, a: 0, b: 0 },
  spectrum: { wavelengthsNm, reflectance: targetReflectance },
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

test("solves a deterministic second recipe against the scissored target curve", async () => {
  const result = await solveSecondRecipe(
    repository,
    record.reference,
    { wavelengthsNm, reflectance: targetReflectance },
    [
      { id: "dark", spectrum: { wavelengthsNm, reflectance: dark }, weight: 1 },
      { id: "light", spectrum: { wavelengthsNm, reflectance: light }, weight: 1 },
    ],
    { initialStep: 0.25, minimumStep: 0.001 },
  );

  assert.equal(result.status, "SECOND_RECIPE_CANDIDATE_SOLVED");
  assert.equal(result.objective, "SPECTRAL_RMSE_TO_SCISSORED_TARGET");
  assert.equal(result.recipe.length, 2);
  assert.ok(Math.abs(result.recipe.reduce((sum, item) => sum + item.normalizedWeight, 0) - 1) < 1e-12);
  assert.equal(result.atlasFit.status, "REFERENCE_LOCKED");
  assert.equal(result.verdict, "SECOND_RECIPE_CANDIDATE");
  assert.ok(result.solver.evaluatedCandidates > 0);
});

test("is repeatable for identical inputs", async () => {
  const inputs = [
    { id: "dark", spectrum: { wavelengthsNm, reflectance: dark }, weight: 0.7 },
    { id: "light", spectrum: { wavelengthsNm, reflectance: light }, weight: 0.3 },
  ] as const;
  const target = { wavelengthsNm, reflectance: targetReflectance } as const;
  const first = await solveSecondRecipe(repository, record.reference, target, inputs);
  const second = await solveSecondRecipe(repository, record.reference, target, inputs);
  assert.deepEqual(first.recipe, second.recipe);
  assert.equal(first.spectralRmseToScissoredTarget, second.spectralRmseToScissoredTarget);
});

test("rejects a non-canonical target spectrum", async () => {
  await assert.rejects(
    solveSecondRecipe(
      repository,
      record.reference,
      { wavelengthsNm: wavelengthsNm.slice(0, 35), reflectance: targetReflectance.slice(0, 35) },
      [{ id: "dark", spectrum: { wavelengthsNm, reflectance: dark }, weight: 1 }],
    ),
    /exactly 36 spectral bands/,
  );
});
