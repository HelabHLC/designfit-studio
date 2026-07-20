import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultSpectralProviderRegistry, SpectralProviderRegistry } from "./registry";

const restrictedProvenance = {
  datasetId: "cmt-hlc-colour-atlas-xl",
  title: "HLC Colour Atlas XL in CMT",
  version: "2023-01",
  dataClass: "RESTRICTED_INTERNAL" as const,
  sourceName: "Color Mixing Tools",
  redistributionConfirmed: false,
  recordCount: 2048,
  wavelengthsNm: Array.from({ length: 36 }, (_, index) => 380 + index * 10),
  sourceSha256: "a".repeat(64),
  notes: "Synthetic provenance fixture; no source dataset is committed.",
};

test("default registry exposes providers in deterministic order", () => {
  const registry = createDefaultSpectralProviderRegistry();
  assert.deepEqual(
    registry.listProviders().map((provider) => provider.providerId),
    ["cgats", "cmt-rs", "customer-measurement"],
  );
});

test("registers a restricted CMT dataset with provenance validation", () => {
  const registry = createDefaultSpectralProviderRegistry();
  const registered = registry.registerDataset("cmt-rs", restrictedProvenance);

  assert.equal(registered.providerId, "cmt-rs");
  assert.equal(registry.getDataset("cmt-hlc-colour-atlas-xl")?.provenance.recordCount, 2048);
  assert.equal(registry.listDatasets("cmt-rs").length, 1);
});

test("rejects duplicate providers and datasets", () => {
  const registry = createDefaultSpectralProviderRegistry();
  assert.throws(
    () =>
      registry.registerProvider({
        providerId: "cmt-rs",
        title: "Duplicate",
        formats: ["rs"],
        dataClasses: ["RESTRICTED_INTERNAL"],
      }),
    /already registered/,
  );

  registry.registerDataset("cmt-rs", restrictedProvenance);
  assert.throws(() => registry.registerDataset("cmt-rs", restrictedProvenance), /already registered/);
});

test("enforces provider data-class boundaries", () => {
  const registry = new SpectralProviderRegistry();
  registry.registerProvider({
    providerId: "open-only",
    title: "Open only",
    formats: ["json"],
    dataClasses: ["OPEN_REFERENCE"],
  });

  assert.throws(
    () => registry.registerDataset("open-only", restrictedProvenance),
    /does not allow data class RESTRICTED_INTERNAL/,
  );
});

test("rejects invalid provenance before registration", () => {
  const registry = createDefaultSpectralProviderRegistry();
  assert.throws(
    () =>
      registry.registerDataset("cmt-rs", {
        ...restrictedProvenance,
        sourceSha256: "invalid",
      }),
    /sourceSha256 must be a lowercase SHA-256 digest/,
  );
});
