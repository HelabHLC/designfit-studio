import type { SpectralDatasetProvenance } from "../../data-governance/spectral-data-policy";

export interface CmtRsImportOptions {
  readonly datasetId: string;
  readonly title: string;
  readonly version: string;
  readonly sourceFileName: string;
  readonly sourceName?: string;
  readonly sourceUrl?: string;
  readonly wavelengthStartNm?: number;
  readonly wavelengthStepNm?: number;
  readonly expectedSampleCount?: number;
  readonly createdAt?: string;
  readonly notes?: string;
}

export interface CmtSpectralRecord {
  readonly recordId: string;
  readonly sourceRow: number;
  readonly name: string;
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
}

export interface CmtSpectralDataset {
  readonly provenance: SpectralDatasetProvenance;
  readonly sourceFileName: string;
  readonly records: readonly CmtSpectralRecord[];
}
