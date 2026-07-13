export type EvidenceLevel =
  | "MEASURED"
  | "CALCULATED"
  | "SIMULATED"
  | "ESTIMATED"
  | "PROXY"
  | "VALIDATED"
  | "NOT_AVAILABLE";

export interface LabColor {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

export interface Spectrum {
  readonly wavelengthsNm: readonly number[];
  readonly reflectance: readonly number[];
  readonly evidence: EvidenceLevel;
}

export interface Reference {
  readonly id: string;
  readonly atlasId: string;
  readonly label?: string;
  readonly lab?: LabColor;
  readonly spectrum?: Spectrum;
  readonly evidence: EvidenceLevel;
  readonly source: string;
  readonly version: string;
}

export interface ReferenceExplanation {
  readonly atlasId: string;
  readonly status: "REFERENCE_CANDIDATE" | "REFERENCE_LOCKED";
  readonly evidence: EvidenceLevel;
  readonly source: string;
  readonly hasLab: boolean;
  readonly hasSpectrum: boolean;
  readonly limitations: readonly string[];
}
