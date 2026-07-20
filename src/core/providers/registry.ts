import type { SpectralDataClass, SpectralDatasetProvenance } from "../data-governance/spectral-data-policy";
import { validateSpectralProvenance } from "../data-governance/provenance-engine";

export interface SpectralProviderDescriptor {
  readonly providerId: string;
  readonly title: string;
  readonly formats: readonly string[];
  readonly dataClasses: readonly SpectralDataClass[];
  readonly notes?: string;
}

export interface RegisteredSpectralDataset {
  readonly providerId: string;
  readonly provenance: SpectralDatasetProvenance;
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
    throw new Error(`${field} must use lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
  return normalized;
}

function normalizeFormats(formats: readonly string[]): readonly string[] {
  const normalized = [...new Set(formats.map((format) => format.trim().toLowerCase()).filter(Boolean))].sort();
  if (normalized.length === 0) throw new Error("A spectral provider must declare at least one format.");
  return normalized;
}

export class SpectralProviderRegistry {
  private readonly providers = new Map<string, SpectralProviderDescriptor>();
  private readonly datasets = new Map<string, RegisteredSpectralDataset>();

  registerProvider(descriptor: SpectralProviderDescriptor): SpectralProviderDescriptor {
    const providerId = normalizeId(descriptor.providerId, "providerId");
    if (this.providers.has(providerId)) throw new Error(`Spectral provider already registered: ${providerId}`);

    const normalized: SpectralProviderDescriptor = Object.freeze({
      ...descriptor,
      providerId,
      title: descriptor.title.trim(),
      formats: Object.freeze([...normalizeFormats(descriptor.formats)]),
      dataClasses: Object.freeze([...new Set(descriptor.dataClasses)].sort()),
    });

    if (!normalized.title) throw new Error("A spectral provider must have a title.");
    if (normalized.dataClasses.length === 0) throw new Error("A spectral provider must allow at least one data class.");

    this.providers.set(providerId, normalized);
    return normalized;
  }

  registerDataset(providerId: string, provenance: SpectralDatasetProvenance): RegisteredSpectralDataset {
    const normalizedProviderId = normalizeId(providerId, "providerId");
    const provider = this.providers.get(normalizedProviderId);
    if (!provider) throw new Error(`Unknown spectral provider: ${normalizedProviderId}`);

    const validation = validateSpectralProvenance(provenance);
    if (!validation.valid) {
      throw new Error(`Invalid spectral provenance: ${validation.issues.map((issue) => issue.message).join(" ")}`);
    }
    if (!provider.dataClasses.includes(provenance.dataClass)) {
      throw new Error(`Provider ${normalizedProviderId} does not allow data class ${provenance.dataClass}.`);
    }

    const datasetId = normalizeId(provenance.datasetId, "datasetId");
    if (this.datasets.has(datasetId)) throw new Error(`Spectral dataset already registered: ${datasetId}`);

    const registered = Object.freeze({ providerId: normalizedProviderId, provenance });
    this.datasets.set(datasetId, registered);
    return registered;
  }

  getProvider(providerId: string): SpectralProviderDescriptor | undefined {
    return this.providers.get(normalizeId(providerId, "providerId"));
  }

  getDataset(datasetId: string): RegisteredSpectralDataset | undefined {
    return this.datasets.get(normalizeId(datasetId, "datasetId"));
  }

  listProviders(): readonly SpectralProviderDescriptor[] {
    return [...this.providers.values()].sort((a, b) => a.providerId.localeCompare(b.providerId));
  }

  listDatasets(providerId?: string): readonly RegisteredSpectralDataset[] {
    const normalizedProviderId = providerId === undefined ? undefined : normalizeId(providerId, "providerId");
    return [...this.datasets.values()]
      .filter((dataset) => normalizedProviderId === undefined || dataset.providerId === normalizedProviderId)
      .sort((a, b) => a.provenance.datasetId.localeCompare(b.provenance.datasetId));
  }
}

export function createDefaultSpectralProviderRegistry(): SpectralProviderRegistry {
  const registry = new SpectralProviderRegistry();
  registry.registerProvider({
    providerId: "cmt-rs",
    title: "Color Mixing Tools .rs",
    formats: ["rs"],
    dataClasses: ["RESTRICTED_INTERNAL", "OPEN_REFERENCE", "ARBE_MEASURED"],
    notes: "Deterministic adapter for tab-separated CMT spectral libraries.",
  });
  registry.registerProvider({
    providerId: "cgats",
    title: "CGATS Spectral Data",
    formats: ["cgats", "txt"],
    dataClasses: ["OPEN_REFERENCE", "ARBE_MEASURED", "RESTRICTED_INTERNAL"],
  });
  registry.registerProvider({
    providerId: "customer-measurement",
    title: "Customer Measurements",
    formats: ["cgats", "csv", "json"],
    dataClasses: ["ARBE_MEASURED", "RESTRICTED_INTERNAL"],
  });
  return registry;
}
