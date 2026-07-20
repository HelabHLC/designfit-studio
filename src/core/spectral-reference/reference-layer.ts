import type { SpectralDataClass } from "../data-governance/spectral-data-policy";
import type { SpectralProviderRegistry } from "../providers/registry";

export interface SpectralReference {
  readonly referenceId: string;
  readonly datasetId: string;
  readonly providerId: string;
  readonly name: string;
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
  readonly dataClass: SpectralDataClass;
  readonly aliases?: readonly string[];
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface SpectralReferenceQuery {
  readonly text?: string;
  readonly providerIds?: readonly string[];
  readonly datasetIds?: readonly string[];
  readonly dataClasses?: readonly SpectralDataClass[];
  readonly limit?: number;
}

export interface SpectralNearestMatch {
  readonly reference: SpectralReference;
  readonly spectralRmse: number;
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
    throw new Error(`${field} must use lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
  return normalized;
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function validateSpectralAxis(wavelengthsNm: readonly number[], reflectance: readonly number[]): void {
  if (wavelengthsNm.length === 0 || wavelengthsNm.length !== reflectance.length) {
    throw new Error("A spectral reference requires matching, non-empty wavelength and reflectance arrays.");
  }

  wavelengthsNm.forEach((wavelength, index) => {
    if (!Number.isFinite(wavelength) || wavelength <= 0) throw new Error(`Invalid wavelength at index ${index}.`);
    if (index > 0 && wavelength <= wavelengthsNm[index - 1]) {
      throw new Error("Spectral reference wavelengths must be strictly increasing.");
    }
  });

  reflectance.forEach((value, index) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Invalid reflectance at index ${index}; expected a value in the range 0..1.`);
    }
  });
}

function spectralRmse(target: readonly number[], candidate: readonly number[]): number {
  let squaredError = 0;
  for (let index = 0; index < target.length; index += 1) {
    const delta = target[index] - candidate[index];
    squaredError += delta * delta;
  }
  return Math.sqrt(squaredError / target.length);
}

export class SpectralReferenceLayer {
  private readonly references = new Map<string, SpectralReference>();

  constructor(private readonly registry: SpectralProviderRegistry) {}

  register(reference: SpectralReference): SpectralReference {
    const referenceId = normalizeId(reference.referenceId, "referenceId");
    const datasetId = normalizeId(reference.datasetId, "datasetId");
    const providerId = normalizeId(reference.providerId, "providerId");

    const registeredDataset = this.registry.getDataset(datasetId);
    if (!registeredDataset) throw new Error(`Unknown spectral dataset: ${datasetId}`);
    if (registeredDataset.providerId !== providerId) {
      throw new Error(`Dataset ${datasetId} is not registered to provider ${providerId}.`);
    }
    if (registeredDataset.provenance.dataClass !== reference.dataClass) {
      throw new Error(`Reference data class does not match dataset provenance for ${datasetId}.`);
    }
    if (registeredDataset.provenance.wavelengthsNm.length !== reference.wavelengthsNm.length ||
      registeredDataset.provenance.wavelengthsNm.some((value, index) => value !== reference.wavelengthsNm[index])) {
      throw new Error(`Reference wavelength axis does not match dataset provenance for ${datasetId}.`);
    }
    if (this.references.has(referenceId)) throw new Error(`Spectral reference already registered: ${referenceId}`);

    validateSpectralAxis(reference.wavelengthsNm, reference.reflectance);
    const normalized = Object.freeze({
      ...reference,
      referenceId,
      datasetId,
      providerId,
      name: reference.name.trim(),
      wavelengthsNm: Object.freeze([...reference.wavelengthsNm]),
      reflectance: Object.freeze([...reference.reflectance]),
      aliases: reference.aliases ? Object.freeze([...reference.aliases.map((alias) => alias.trim()).filter(Boolean)].sort()) : undefined,
      metadata: reference.metadata ? Object.freeze({ ...reference.metadata }) : undefined,
    });
    if (!normalized.name) throw new Error("A spectral reference must have a name.");

    this.references.set(referenceId, normalized);
    return normalized;
  }

  get(referenceId: string): SpectralReference | undefined {
    return this.references.get(normalizeId(referenceId, "referenceId"));
  }

  search(query: SpectralReferenceQuery = {}): readonly SpectralReference[] {
    const providerIds = query.providerIds?.map((value) => normalizeId(value, "providerId"));
    const datasetIds = query.datasetIds?.map((value) => normalizeId(value, "datasetId"));
    const text = query.text ? normalizeText(query.text) : undefined;
    const limit = query.limit ?? Number.POSITIVE_INFINITY;
    if (!Number.isInteger(limit) && limit !== Number.POSITIVE_INFINITY) throw new Error("limit must be an integer.");
    if (limit < 0) throw new Error("limit must not be negative.");

    return [...this.references.values()]
      .filter((reference) => !providerIds || providerIds.includes(reference.providerId))
      .filter((reference) => !datasetIds || datasetIds.includes(reference.datasetId))
      .filter((reference) => !query.dataClasses || query.dataClasses.includes(reference.dataClass))
      .filter((reference) => {
        if (!text) return true;
        const haystack = [reference.referenceId, reference.name, ...(reference.aliases ?? [])]
          .map(normalizeText)
          .join("\n");
        return haystack.includes(text);
      })
      .sort((a, b) => a.referenceId.localeCompare(b.referenceId))
      .slice(0, limit);
  }

  nearest(targetWavelengthsNm: readonly number[], targetReflectance: readonly number[], query: SpectralReferenceQuery = {}): readonly SpectralNearestMatch[] {
    validateSpectralAxis(targetWavelengthsNm, targetReflectance);
    const candidates = this.search({ ...query, limit: undefined });
    const limit = query.limit ?? candidates.length;
    if (!Number.isInteger(limit) || limit < 0) throw new Error("limit must be a non-negative integer.");

    return candidates
      .filter((reference) => reference.wavelengthsNm.length === targetWavelengthsNm.length &&
        reference.wavelengthsNm.every((value, index) => value === targetWavelengthsNm[index]))
      .map((reference) => ({ reference, spectralRmse: spectralRmse(targetReflectance, reference.reflectance) }))
      .sort((a, b) => a.spectralRmse - b.spectralRmse || a.reference.referenceId.localeCompare(b.reference.referenceId))
      .slice(0, limit);
  }
}
