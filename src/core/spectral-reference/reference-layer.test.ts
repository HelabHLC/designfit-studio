import assert from "node:assert/strict";
import test from "node:test";

import type { SpectralDatasetProvenance } from "../data-governance/spectral-data-policy";
import { createDefaultSpectralProviderRegistry } from "../providers/registry";
import { SpectralReferenceLayer } from "./reference-layer";

const wavelengthsNm = [380, 390, 400, 410];
const sourceSha256 = "a".repeat(64);

function provenance(datasetId: string, providerTitle: string): SpectralDatasetProvenance {
  return {
    datasetId,
    title: providerTitle,
    version: "synthetic-v1",
    dataClass: "RESTRICTED_INTERNAL",
    sourceName: providerTitle,
    redistributionConfirmed: false,
    recordCount: 2,
    wavelengthsNm,
    sourceSha256,
  };
}

test("registers references only against matching provider provenance", () => {
  const registry = createDefaultSpectralProviderRegistry();
  registry.registerDataset("cmt-rs", provenance("hlc-atlas-xl-cmt", "Synthetic HLC Atlas"));
  const layer = new SpectralReferenceLayer(registry);

  const reference = layer.register({
    referenceId: "hlc.h000_l050_c000",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "H000_L050_C000",
    aliases: ["neutral 50", "HLC neutral"],
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.2, 0.21, 0.22, 0.23],
  });

  assert.equal(reference.referenceId, "hlc.h000_l050_c000");
  assert.equal(layer.get("HLC.H000_L050_C000"), reference);
  assert.throws(() => layer.register({ ...reference, referenceId: "hlc.other", providerId: "cgats" }), /not registered/);
});

test("searches deterministically across identity, aliases, datasets, and providers", () => {
  const registry = createDefaultSpectralProviderRegistry();
  registry.registerDataset("cmt-rs", provenance("hlc-atlas-xl-cmt", "Synthetic HLC Atlas"));
  const layer = new SpectralReferenceLayer(registry);

  layer.register({
    referenceId: "hlc.h120_l060_c040",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "H120_L060_C040",
    aliases: ["green reference"],
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.1, 0.2, 0.3, 0.4],
  });
  layer.register({
    referenceId: "hlc.h030_l060_c040",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "H030_L060_C040",
    aliases: ["orange reference"],
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.4, 0.3, 0.2, 0.1],
  });

  assert.deepEqual(layer.search().map((entry) => entry.referenceId), [
    "hlc.h030_l060_c040",
    "hlc.h120_l060_c040",
  ]);
  assert.deepEqual(layer.search({ text: "green" }).map((entry) => entry.referenceId), ["hlc.h120_l060_c040"]);
  assert.equal(layer.search({ providerIds: ["cmt-rs"], limit: 1 }).length, 1);
});

test("ranks nearest spectral references by RMSE with stable tie-breaking", () => {
  const registry = createDefaultSpectralProviderRegistry();
  registry.registerDataset("cmt-rs", provenance("hlc-atlas-xl-cmt", "Synthetic HLC Atlas"));
  const layer = new SpectralReferenceLayer(registry);

  for (const [referenceId, reflectance] of [
    ["hlc.b", [0.2, 0.2, 0.2, 0.2]],
    ["hlc.a", [0.2, 0.2, 0.2, 0.2]],
    ["hlc.c", [0.8, 0.8, 0.8, 0.8]],
  ] as const) {
    layer.register({
      referenceId,
      datasetId: "hlc-atlas-xl-cmt",
      providerId: "cmt-rs",
      name: referenceId,
      dataClass: "RESTRICTED_INTERNAL",
      wavelengthsNm,
      reflectance,
    });
  }

  const matches = layer.nearest(wavelengthsNm, [0.21, 0.21, 0.21, 0.21], { limit: 2 });
  assert.deepEqual(matches.map((match) => match.reference.referenceId), ["hlc.a", "hlc.b"]);
  assert.ok(matches.every((match) => Math.abs(match.spectralRmse - 0.01) < 1e-12));
});

test("rejects invalid axes and provenance mismatches", () => {
  const registry = createDefaultSpectralProviderRegistry();
  registry.registerDataset("cmt-rs", provenance("hlc-atlas-xl-cmt", "Synthetic HLC Atlas"));
  const layer = new SpectralReferenceLayer(registry);

  assert.throws(() => layer.register({
    referenceId: "hlc.invalid",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "Invalid",
    dataClass: "RESTRICTED_INTERNAL",
    wavelengthsNm,
    reflectance: [0.1, 0.2],
  }), /matching, non-empty/);

  assert.throws(() => layer.register({
    referenceId: "hlc.open",
    datasetId: "hlc-atlas-xl-cmt",
    providerId: "cmt-rs",
    name: "Wrong class",
    dataClass: "OPEN_REFERENCE",
    wavelengthsNm,
    reflectance: [0.1, 0.2, 0.3, 0.4],
  }), /data class/);
});
