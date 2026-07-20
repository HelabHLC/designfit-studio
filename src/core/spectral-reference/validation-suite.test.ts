import assert from "node:assert/strict";
import test from "node:test";

import type { SpectralDatasetProvenance } from "../data-governance/spectral-data-policy";
import { createDefaultSpectralProviderRegistry } from "../providers/registry";
import { SpectralReferenceLayer } from "./reference-layer";
import { validateSpectralReferenceSystem } from "./validation-suite";

const wavelengthsNm = [380, 390, 400, 410];

function provenance(datasetId: string): SpectralDatasetProvenance {
  return {
    datasetId,
    title: "Synthetic Atlas",
    version: "synthetic-v1",
    dataClass: "RESTRICTED_INTERNAL",
    sourceName: "Synthetic Atlas",
    redistributionConfirmed: false,
    recordCount: 2,
    wavelengthsNm,
    sourceSha256: "a".repeat(64),
  };
}

function fixture() {
  const registry = createDefaultSpectralProviderRegistry();
  registry.registerDataset("cmt-rs", provenance("hlc-atlas-xl-cmt"));
  const layer = new SpectralReferenceLayer(registry);
  layer.register({
    referenceId: "hlc.h030_l060_c040",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "H030_L060_C040",
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.4, 0.3, 0.2, 0.1],
  });
  layer.register({
    referenceId: "hlc.h120_l060_c040",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "H120_L060_C040",
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.1, 0.2, 0.3, 0.4],
  });
  return { registry, layer };
}

test("produces a valid deterministic validation report", () => {
  const { registry, layer } = fixture();
  const expectations = {
    minimumProviders: 3,
    minimumDatasets: 1,
    minimumReferences: 2,
    requiredProviderIds: ["cmt-rs"],
    requiredDatasetIds: ["hlc-atlas-xl-cmt"],
    expectedWavelengthsNm: wavelengthsNm,
  };

  const first = validateSpectralReferenceSystem(registry, layer, expectations);
  const second = validateSpectralReferenceSystem(registry, layer, expectations);

  assert.equal(first.valid, true);
  assert.equal(first.providerCount, 3);
  assert.equal(first.datasetCount, 1);
  assert.equal(first.referenceCount, 2);
  assert.deepEqual(first.issues, []);
  assert.equal(first.fingerprint, second.fingerprint);
});

test("reports missing governed inventory in stable order", () => {
  const { registry, layer } = fixture();
  const report = validateSpectralReferenceSystem(registry, layer, {
    minimumProviders: 4,
    minimumDatasets: 2,
    minimumReferences: 3,
    requiredProviderIds: ["missing-provider"],
    requiredDatasetIds: ["missing-dataset"],
  });

  assert.equal(report.valid, false);
  assert.deepEqual(report.issues.map((issue) => issue.code), [
    "DATASET_COUNT",
    "MISSING_DATASET",
    "MISSING_PROVIDER",
    "PROVIDER_COUNT",
    "REFERENCE_COUNT",
  ]);
});

test("detects an unexpected wavelength policy without modifying source data", () => {
  const { registry, layer } = fixture();
  const report = validateSpectralReferenceSystem(registry, layer, {
    expectedWavelengthsNm: [400, 410, 420, 430],
  });

  assert.equal(report.valid, false);
  assert.equal(report.issues.length, 2);
  assert.ok(report.issues.every((issue) => issue.code === "WAVELENGTH_AXIS_MISMATCH"));
});
