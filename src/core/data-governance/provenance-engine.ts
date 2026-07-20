import { createHash } from "node:crypto";

import type { SpectralDatasetProvenance } from "./spectral-data-policy";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export interface ProvenanceValidationIssue {
  readonly field: keyof SpectralDatasetProvenance | "wavelengthsNm";
  readonly message: string;
}

export interface ProvenanceValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ProvenanceValidationIssue[];
}

export interface SpectralProvenanceManifest {
  readonly schema: "arbe.spectral-provenance/v1";
  readonly provenance: SpectralDatasetProvenance;
  readonly provenanceSha256: string;
  readonly generatedAt: string;
}

function assertNonEmpty(value: string, field: keyof SpectralDatasetProvenance, issues: ProvenanceValidationIssue[]): void {
  if (value.trim().length === 0) issues.push({ field, message: `${field} must not be empty.` });
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function fingerprintProvenance(provenance: SpectralDatasetProvenance): string {
  return sha256Text(canonicalize(provenance));
}

export function validateSpectralProvenance(
  provenance: SpectralDatasetProvenance,
): ProvenanceValidationResult {
  const issues: ProvenanceValidationIssue[] = [];

  assertNonEmpty(provenance.datasetId, "datasetId", issues);
  assertNonEmpty(provenance.title, "title", issues);
  assertNonEmpty(provenance.version, "version", issues);
  assertNonEmpty(provenance.sourceName, "sourceName", issues);

  if (!Number.isInteger(provenance.recordCount) || provenance.recordCount < 0) {
    issues.push({ field: "recordCount", message: "recordCount must be a non-negative integer." });
  }

  if (provenance.wavelengthsNm.length === 0) {
    issues.push({ field: "wavelengthsNm", message: "At least one wavelength is required." });
  }

  const wavelengthSet = new Set<number>();
  for (const [index, wavelength] of provenance.wavelengthsNm.entries()) {
    if (!Number.isFinite(wavelength) || wavelength <= 0) {
      issues.push({ field: "wavelengthsNm", message: `Invalid wavelength at index ${index}.` });
      continue;
    }
    if (wavelengthSet.has(wavelength)) {
      issues.push({ field: "wavelengthsNm", message: `Duplicate wavelength: ${wavelength} nm.` });
    }
    wavelengthSet.add(wavelength);
    if (index > 0 && wavelength <= provenance.wavelengthsNm[index - 1]) {
      issues.push({ field: "wavelengthsNm", message: "Wavelengths must be strictly increasing." });
    }
  }

  if (!SHA256_PATTERN.test(provenance.sourceSha256)) {
    issues.push({ field: "sourceSha256", message: "sourceSha256 must be a lowercase SHA-256 digest." });
  }

  if (provenance.dataClass === "OPEN_REFERENCE" && !provenance.licenceId) {
    issues.push({ field: "licenceId", message: "OPEN_REFERENCE requires an explicit licenceId." });
  }

  if (provenance.redistributionConfirmed && !provenance.licenceId && !provenance.licenceTextPath) {
    issues.push({
      field: "redistributionConfirmed",
      message: "Confirmed redistribution requires a licenceId or licenceTextPath.",
    });
  }

  return { valid: issues.length === 0, issues };
}

export function createSpectralProvenanceManifest(
  provenance: SpectralDatasetProvenance,
  generatedAt: string,
): SpectralProvenanceManifest {
  const validation = validateSpectralProvenance(provenance);
  if (!validation.valid) {
    throw new Error(`Invalid spectral provenance: ${validation.issues.map((issue) => issue.message).join(" ")}`);
  }

  const timestamp = new Date(generatedAt);
  if (Number.isNaN(timestamp.getTime())) throw new Error("generatedAt must be a valid ISO-compatible timestamp.");

  return {
    schema: "arbe.spectral-provenance/v1",
    provenance,
    provenanceSha256: fingerprintProvenance(provenance),
    generatedAt: timestamp.toISOString(),
  };
}

export function verifySpectralProvenanceManifest(manifest: SpectralProvenanceManifest): boolean {
  return (
    manifest.schema === "arbe.spectral-provenance/v1" &&
    validateSpectralProvenance(manifest.provenance).valid &&
    fingerprintProvenance(manifest.provenance) === manifest.provenanceSha256
  );
}
