import type { SpectralProviderRegistry } from "../providers/registry";
import type { SpectralReferenceLayer } from "./reference-layer";

export type ValidationSeverity = "ERROR" | "WARNING";

export interface SpectralReferenceValidationIssue {
  readonly code: string;
  readonly severity: ValidationSeverity;
  readonly message: string;
}

export interface SpectralReferenceValidationExpectations {
  readonly minimumProviders?: number;
  readonly minimumDatasets?: number;
  readonly minimumReferences?: number;
  readonly requiredProviderIds?: readonly string[];
  readonly requiredDatasetIds?: readonly string[];
  readonly expectedWavelengthsNm?: readonly number[];
}

export interface SpectralReferenceValidationReport {
  readonly valid: boolean;
  readonly providerCount: number;
  readonly datasetCount: number;
  readonly referenceCount: number;
  readonly issues: readonly SpectralReferenceValidationIssue[];
  readonly fingerprint: string;
}

function stableFingerprint(parts: readonly string[]): string {
  let hash = 2166136261;
  for (const char of parts.join("\u001f")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function validateSpectralReferenceSystem(
  registry: SpectralProviderRegistry,
  layer: SpectralReferenceLayer,
  expectations: SpectralReferenceValidationExpectations = {},
): SpectralReferenceValidationReport {
  const providers = registry.listProviders();
  const datasets = registry.listDatasets();
  const references = layer.search();
  const issues: SpectralReferenceValidationIssue[] = [];

  const add = (code: string, severity: ValidationSeverity, message: string): void => {
    issues.push(Object.freeze({ code, severity, message }));
  };

  if (providers.length < (expectations.minimumProviders ?? 0)) {
    add("PROVIDER_COUNT", "ERROR", `Expected at least ${expectations.minimumProviders} providers; found ${providers.length}.`);
  }
  if (datasets.length < (expectations.minimumDatasets ?? 0)) {
    add("DATASET_COUNT", "ERROR", `Expected at least ${expectations.minimumDatasets} datasets; found ${datasets.length}.`);
  }
  if (references.length < (expectations.minimumReferences ?? 0)) {
    add("REFERENCE_COUNT", "ERROR", `Expected at least ${expectations.minimumReferences} references; found ${references.length}.`);
  }

  for (const providerId of [...(expectations.requiredProviderIds ?? [])].sort()) {
    if (!registry.getProvider(providerId)) add("MISSING_PROVIDER", "ERROR", `Required provider is missing: ${providerId}`);
  }
  for (const datasetId of [...(expectations.requiredDatasetIds ?? [])].sort()) {
    if (!registry.getDataset(datasetId)) add("MISSING_DATASET", "ERROR", `Required dataset is missing: ${datasetId}`);
  }

  for (const reference of references) {
    const dataset = registry.getDataset(reference.datasetId);
    if (!dataset) {
      add("ORPHAN_REFERENCE", "ERROR", `Reference ${reference.referenceId} points to unknown dataset ${reference.datasetId}.`);
      continue;
    }
    if (dataset.providerId !== reference.providerId) {
      add("PROVIDER_MISMATCH", "ERROR", `Reference ${reference.referenceId} has a provider mismatch.`);
    }
    if (dataset.provenance.dataClass !== reference.dataClass) {
      add("DATA_CLASS_MISMATCH", "ERROR", `Reference ${reference.referenceId} has a data-class mismatch.`);
    }
    const axis = expectations.expectedWavelengthsNm ?? dataset.provenance.wavelengthsNm;
    if (axis.length !== reference.wavelengthsNm.length || axis.some((value, index) => value !== reference.wavelengthsNm[index])) {
      add("WAVELENGTH_AXIS_MISMATCH", "ERROR", `Reference ${reference.referenceId} has an unexpected wavelength axis.`);
    }
  }

  const firstSearch = layer.search().map((reference) => reference.referenceId);
  const secondSearch = layer.search().map((reference) => reference.referenceId);
  if (firstSearch.join("\n") !== secondSearch.join("\n")) {
    add("NON_DETERMINISTIC_SEARCH", "ERROR", "Repeated unfiltered searches returned different orderings.");
  }

  const fingerprintParts = [
    ...providers.map((provider) => `P:${provider.providerId}`),
    ...datasets.map((dataset) => `D:${dataset.provenance.datasetId}:${dataset.provenance.sourceSha256}`),
    ...references.map((reference) => `R:${reference.referenceId}:${reference.datasetId}:${reference.reflectance.join(",")}`),
  ];

  const sortedIssues = issues.sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message));
  return Object.freeze({
    valid: !sortedIssues.some((issue) => issue.severity === "ERROR"),
    providerCount: providers.length,
    datasetCount: datasets.length,
    referenceCount: references.length,
    issues: Object.freeze([...sortedIssues]),
    fingerprint: stableFingerprint(fingerprintParts),
  });
}
