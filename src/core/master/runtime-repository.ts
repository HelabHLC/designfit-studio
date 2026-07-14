import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import type { MasterRecord, MasterRepository } from "./types";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const EXPECTED_WAVELENGTHS = Object.freeze(
  Array.from({ length: 36 }, (_, index) => 380 + index * 10),
);

export interface RuntimeMasterManifest {
  readonly datasetId: string;
  readonly title: string;
  readonly fileName: string;
  readonly format: "application/x-ndjson+gzip";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly recordCount: number;
  readonly identityField: "reference";
  readonly spectralGridNm: readonly number[];
  readonly status: "AVAILABLE" | "VERIFIED";
}

export class RuntimeMasterFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeMasterFormatError";
  }
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RuntimeMasterFormatError(`${label} must be a finite number`);
  }
}

function validateRecord(value: unknown, lineNumber: number): MasterRecord {
  if (!value || typeof value !== "object") {
    throw new RuntimeMasterFormatError(`line ${lineNumber}: record must be an object`);
  }

  const record = value as Record<string, unknown>;
  const reference = record.reference;
  if (typeof reference !== "string" || !REFERENCE_PATTERN.test(reference)) {
    throw new RuntimeMasterFormatError(`line ${lineNumber}: invalid ARBE reference`);
  }

  const lab = record.lab as Record<string, unknown> | undefined;
  if (!lab) throw new RuntimeMasterFormatError(`line ${lineNumber}: lab is required`);
  assertFiniteNumber(lab.l, `line ${lineNumber}: lab.l`);
  assertFiniteNumber(lab.a, `line ${lineNumber}: lab.a`);
  assertFiniteNumber(lab.b, `line ${lineNumber}: lab.b`);

  const spectrum = record.spectrum as Record<string, unknown> | undefined;
  if (!spectrum) throw new RuntimeMasterFormatError(`line ${lineNumber}: spectrum is required`);
  const wavelengthsNm = spectrum.wavelengthsNm;
  const reflectance = spectrum.reflectance;
  if (!Array.isArray(wavelengthsNm) || !Array.isArray(reflectance)) {
    throw new RuntimeMasterFormatError(`line ${lineNumber}: spectrum arrays are required`);
  }
  if (wavelengthsNm.length !== 36 || reflectance.length !== 36) {
    throw new RuntimeMasterFormatError(`line ${lineNumber}: spectrum must contain 36 bands`);
  }
  for (let index = 0; index < 36; index += 1) {
    if (wavelengthsNm[index] !== EXPECTED_WAVELENGTHS[index]) {
      throw new RuntimeMasterFormatError(`line ${lineNumber}: invalid wavelength grid`);
    }
    assertFiniteNumber(reflectance[index], `line ${lineNumber}: reflectance[${index}]`);
    if (reflectance[index] < 0 || reflectance[index] > 1) {
      throw new RuntimeMasterFormatError(`line ${lineNumber}: reflectance outside 0..1`);
    }
  }

  return value as MasterRecord;
}

export class RuntimeMasterRepository implements MasterRepository {
  private constructor(
    private readonly manifest: RuntimeMasterManifest,
    private readonly records: ReadonlyMap<string, MasterRecord>,
  ) {}

  static fromGzipJsonl(payload: Uint8Array, manifest: RuntimeMasterManifest): RuntimeMasterRepository {
    if (payload.byteLength !== manifest.sizeBytes) {
      throw new RuntimeMasterFormatError("runtime export size does not match manifest");
    }

    const actualSha256 = createHash("sha256").update(payload).digest("hex");
    if (actualSha256 !== manifest.sha256.toLowerCase()) {
      throw new RuntimeMasterFormatError("runtime export SHA-256 does not match manifest");
    }

    if (
      manifest.spectralGridNm.length !== EXPECTED_WAVELENGTHS.length ||
      manifest.spectralGridNm.some((value, index) => value !== EXPECTED_WAVELENGTHS[index])
    ) {
      throw new RuntimeMasterFormatError("manifest spectral grid is not canonical 380–730 nm / 10 nm");
    }

    const text = gunzipSync(payload).toString("utf8");
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length !== manifest.recordCount) {
      throw new RuntimeMasterFormatError("runtime record count does not match manifest");
    }

    const records = new Map<string, MasterRecord>();
    lines.forEach((line, index) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        throw new RuntimeMasterFormatError(`line ${index + 1}: invalid JSON`);
      }
      const record = validateRecord(parsed, index + 1);
      if (records.has(record.reference)) {
        throw new RuntimeMasterFormatError(`line ${index + 1}: duplicate reference ${record.reference}`);
      }
      records.set(record.reference, record);
    });

    return new RuntimeMasterRepository(manifest, records);
  }

  async getManifest(): Promise<RuntimeMasterManifest> {
    return this.manifest;
  }

  async verifySource(): Promise<void> {
    if (this.records.size !== this.manifest.recordCount) {
      throw new RuntimeMasterFormatError("runtime repository is incomplete");
    }
  }

  async findByReference(reference: string): Promise<MasterRecord | undefined> {
    if (!REFERENCE_PATTERN.test(reference)) return undefined;
    return this.records.get(reference);
  }

  async listReferences(): Promise<readonly string[]> {
    return [...this.records.keys()].sort();
  }

  async listRecords(): Promise<readonly MasterRecord[]> {
    return [...this.records.values()];
  }
}
