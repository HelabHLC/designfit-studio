import assert from "node:assert/strict";
import test from "node:test";

import type { SpectralDatasetProvenance } from "./spectral-data-policy";
import {
  createSpectralProvenanceManifest,
  fingerprintProvenance,
  validateSpectralProvenance,
  verifySpectralProvenanceManifest,
} from "./provenance-engine";

function provenance(
  overrides: Partial<SpectralDatasetProvenance> = {},
): SpectralDatasetProvenance {
  return {
    datasetId: "cmt:synthetic-test",
    title: "Synthetic CMT test dataset",
    version: "1",
    dataClass: "RESTRICTED_INTERNAL",
    sourceName: "University of Brescia / Color Mixing Tools",
    licenceTextPath: "docs/legal/permissions/cmt-data-permission.md",
    redistributionConfirmed: false,
    recordCount: 2,
    wavelengthsNm: [380, 390, 400],
    sourceSha256: "a".repeat(64),
    ...overrides,
  };
}

test("validates a restricted dataset with unconfirmed redistribution", () => {
  const result = validateSpectralProvenance(provenance());
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
});

test("rejects malformed hashes and non-increasing wavelengths", () => {
  const result = validateSpectralProvenance(
    provenance({ sourceSha256: "BAD", wavelengthsNm: [380, 400, 390] }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.field === "sourceSha256"));
  assert.ok(result.issues.some((issue) => issue.field === "wavelengthsNm"));
});

test("requires licence evidence when redistribution is confirmed", () => {
  const result = validateSpectralProvenance(
    provenance({ redistributionConfirmed: true, licenceTextPath: undefined }),
  );

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.field === "redistributionConfirmed"));
});

test("produces a deterministic provenance fingerprint independent of key order", () => {
  const first = provenance();
  const second = {
    sourceSha256: first.sourceSha256,
    wavelengthsNm: first.wavelengthsNm,
    recordCount: first.recordCount,
    redistributionConfirmed: first.redistributionConfirmed,
    licenceTextPath: first.licenceTextPath,
    sourceName: first.sourceName,
    dataClass: first.dataClass,
    version: first.version,
    title: first.title,
    datasetId: first.datasetId,
  } satisfies SpectralDatasetProvenance;

  assert.equal(fingerprintProvenance(first), fingerprintProvenance(second));
});

test("detects a tampered provenance manifest", () => {
  const manifest = createSpectralProvenanceManifest(provenance(), "2026-07-20T08:00:00+02:00");
  assert.equal(verifySpectralProvenanceManifest(manifest), true);
  assert.equal(manifest.generatedAt, "2026-07-20T06:00:00.000Z");

  const tampered = {
    ...manifest,
    provenance: { ...manifest.provenance, recordCount: 3 },
  };
  assert.equal(verifySpectralProvenanceManifest(tampered), false);
});
