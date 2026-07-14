export type SpectralDataClass =
  | "OPEN_REFERENCE"
  | "ARBE_MEASURED"
  | "RESTRICTED_INTERNAL";

export interface SpectralDatasetProvenance {
  readonly datasetId: string;
  readonly title: string;
  readonly version: string;
  readonly dataClass: SpectralDataClass;
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly licenceId?: string;
  readonly licenceTextPath?: string;
  readonly redistributionConfirmed: boolean;
  readonly measurementOwner?: string;
  readonly recordCount: number;
  readonly wavelengthsNm: readonly number[];
  readonly sourceSha256: string;
  readonly createdAt?: string;
  readonly notes?: string;
}

export interface PublicationDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export function evaluatePublication(
  dataset: SpectralDatasetProvenance,
): PublicationDecision {
  if (dataset.dataClass === "RESTRICTED_INTERNAL") {
    return {
      allowed: false,
      reason: "Restricted internal spectral data must not be published or redistributed.",
    };
  }

  if (!dataset.redistributionConfirmed) {
    return {
      allowed: false,
      reason: "Redistribution rights have not been confirmed for this dataset.",
    };
  }

  if (!dataset.licenceId && dataset.dataClass === "OPEN_REFERENCE") {
    return {
      allowed: false,
      reason: "Open-reference publication requires an explicit licence identifier.",
    };
  }

  return {
    allowed: true,
    reason: "Dataset satisfies the current ARBE publication gate.",
  };
}
