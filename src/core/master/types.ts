import type { LabColor } from "../reference";

export interface MasterDatasetManifest {
  readonly datasetId: string;
  readonly title: string;
  readonly fileName: string;
  readonly format: "python-pickle/pandas-dataframe" | "application/x-ndjson+gzip";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly recordCount: number;
  readonly columnCount?: number;
  readonly identityField: "reference";
  readonly spectralGridNm: readonly number[];
  readonly status: "REGISTERED_NOT_COMMITTED" | "AVAILABLE" | "VERIFIED";
}

export interface MasterRecord {
  readonly reference: string;
  readonly atlasIdentityValid: boolean;
  readonly lambdaV2Method: string;
  readonly sourceAtlas: string;
  readonly sourceCxf: string;
  readonly lab: LabColor;
  readonly hex?: string;
  readonly rgb?: readonly [number, number, number];
  readonly spectrum: {
    readonly wavelengthsNm: readonly number[];
    readonly reflectance: readonly number[];
  };
  readonly lambdaV2Nm?: number;
  readonly lambdaEeNm?: number;
  readonly deltaLambdaNm?: number;
  readonly sigmaStarNm?: number;
  readonly skewnessGamma1?: number;
  readonly illuminantExtensions?: Readonly<Record<string, number>>;
  readonly raw?: Readonly<Record<string, unknown>>;
}

export interface MasterRepository {
  getManifest(): Promise<MasterDatasetManifest>;
  verifySource(): Promise<void>;
  findByReference(reference: string): Promise<MasterRecord | undefined>;
  listReferences(): Promise<readonly string[]>;
}

export class MasterSourceIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MasterSourceIntegrityError";
  }
}
