import { assertAtlasId } from "../reference";
import type { AtlasDataset, AtlasDatasetMetadata, AtlasSearchResult } from "./types";

export interface AtlasRepository {
  register(dataset: AtlasDataset): Promise<void>;
  getDataset(datasetId: string, version?: string): Promise<AtlasDataset | undefined>;
  listDatasets(): Promise<readonly AtlasDatasetMetadata[]>;
  findByAtlasId(
    atlasId: string,
    datasetId?: string,
    version?: string,
  ): Promise<AtlasSearchResult | undefined>;
}

function datasetKey(datasetId: string, version: string): string {
  return `${datasetId}@${version}`;
}

export class InMemoryAtlasRepository implements AtlasRepository {
  private readonly datasets = new Map<string, AtlasDataset>();
  private readonly latestVersion = new Map<string, string>();

  async register(dataset: AtlasDataset): Promise<void> {
    const { datasetId, version, recordCount } = dataset.metadata;
    if (recordCount !== dataset.records.length) {
      throw new Error(
        `Dataset ${datasetId}@${version} declares ${recordCount} records but contains ${dataset.records.length}.`,
      );
    }

    const key = datasetKey(datasetId, version);
    if (this.datasets.has(key)) {
      throw new Error(`Atlas dataset already registered: ${key}.`);
    }

    this.datasets.set(key, dataset);
    this.latestVersion.set(datasetId, version);
  }

  async getDataset(
    datasetId: string,
    version?: string,
  ): Promise<AtlasDataset | undefined> {
    const resolvedVersion = version ?? this.latestVersion.get(datasetId);
    return resolvedVersion
      ? this.datasets.get(datasetKey(datasetId, resolvedVersion))
      : undefined;
  }

  async listDatasets(): Promise<readonly AtlasDatasetMetadata[]> {
    return [...this.datasets.values()].map((dataset) => dataset.metadata);
  }

  async findByAtlasId(
    atlasId: string,
    datasetId?: string,
    version?: string,
  ): Promise<AtlasSearchResult | undefined> {
    assertAtlasId(atlasId);

    const candidates = datasetId
      ? [await this.getDataset(datasetId, version)].filter(
          (dataset): dataset is AtlasDataset => Boolean(dataset),
        )
      : [...this.datasets.values()];

    for (const dataset of candidates) {
      const record = dataset.records.find((entry) => entry.atlasId === atlasId);
      if (record) return { record, dataset: dataset.metadata };
    }

    return undefined;
  }
}
