import type { LabColor } from "../reference";

export interface AtlasDatasetMetadata {
  readonly datasetId: string;
  readonly title: string;
  readonly version: string;
  readonly releasedAt?: string;
  readonly source: string;
  readonly license?: string;
  readonly recordCount: number;
  readonly checksum?: string;
  readonly illuminant?: string;
  readonly observer?: string;
}

export interface SpectralSample {
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
  readonly source: "OPTIMIZED" | "MEASURED" | "UNKNOWN";
}

export interface AtlasRecord {
  readonly atlasId: string;
  readonly lab: LabColor;
  readonly hex?: string;
  readonly name?: string;
  readonly spectrum?: SpectralSample;
  readonly sourceRow?: number;
}

export interface AtlasDataset {
  readonly metadata: AtlasDatasetMetadata;
  readonly records: readonly AtlasRecord[];
}

export interface AtlasSearchResult {
  readonly record: AtlasRecord;
  readonly dataset: AtlasDatasetMetadata;
}
