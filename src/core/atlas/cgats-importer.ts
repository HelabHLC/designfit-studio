import { assertAtlasId } from "../reference";
import type { AtlasDataset, AtlasDatasetMetadata, AtlasRecord } from "./types";

const SPECTRAL_FIELD = /^SPECTRAL_NM_(\d{3})$/;
const HLC_PATTERN = /^H(\d{3})_L(\d{3})_C(\d{3})$/;

export interface CgatsImportOptions {
  readonly metadata: Omit<AtlasDatasetMetadata, "recordCount"> & {
    readonly recordCount?: number;
  };
  readonly spectralSource?: "OPTIMIZED" | "MEASURED" | "UNKNOWN";
}

export class CgatsImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CgatsImportError";
  }
}

function parseHlcLab(atlasId: string): AtlasRecord["lab"] {
  const match = HLC_PATTERN.exec(atlasId);
  if (!match) throw new CgatsImportError(`Invalid HLC identifier: ${atlasId}`);

  const hueDegrees = Number(match[1]);
  const lightness = Number(match[2]);
  const chroma = Number(match[3]);
  const radians = (hueDegrees * Math.PI) / 180;

  return {
    l: lightness,
    a: chroma * Math.cos(radians),
    b: chroma * Math.sin(radians),
  };
}

function parseTrailingInteger(line: string | undefined): number | undefined {
  if (!line) return undefined;
  const value = Number(line.split(/\s+/).at(-1));
  return Number.isInteger(value) ? value : undefined;
}

export function importCgatsSpectralDataset(
  sourceText: string,
  options: CgatsImportOptions,
): AtlasDataset {
  const lines = sourceText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const formatStart = lines.indexOf("BEGIN_DATA_FORMAT");
  const formatEnd = lines.indexOf("END_DATA_FORMAT");
  const dataStart = lines.indexOf("BEGIN_DATA");
  const dataEnd = lines.indexOf("END_DATA");

  if (formatStart < 0 || formatEnd < 0 || dataStart < 0 || dataEnd < 0) {
    throw new CgatsImportError("CGATS data-format or data block is missing.");
  }
  if (!(formatStart < formatEnd && formatEnd < dataStart && dataStart < dataEnd)) {
    throw new CgatsImportError("CGATS blocks are out of order.");
  }

  const formatLines = lines.slice(formatStart + 1, formatEnd);
  if (formatLines.length !== 1) {
    throw new CgatsImportError("CGATS data format must contain exactly one field line.");
  }

  const fields = formatLines[0].split(/\s+/);
  if (fields[0] !== "SAMPLE_NAME") {
    throw new CgatsImportError("First CGATS field must be SAMPLE_NAME.");
  }

  const declaredFields = parseTrailingInteger(
    lines.find((line) => line.startsWith("NUMBER_OF_FIELDS")),
  );
  if (declaredFields !== undefined && declaredFields !== fields.length) {
    throw new CgatsImportError(
      `CGATS declares ${declaredFields} fields but format contains ${fields.length}.`,
    );
  }

  const wavelengthFields = fields.slice(1).map((field) => {
    const match = SPECTRAL_FIELD.exec(field);
    if (!match) throw new CgatsImportError(`Unsupported CGATS field: ${field}`);
    return Number(match[1]);
  });

  if (wavelengthFields.length === 0) {
    throw new CgatsImportError("No spectral wavelength fields found.");
  }
  if (new Set(wavelengthFields).size !== wavelengthFields.length) {
    throw new CgatsImportError("Duplicate spectral wavelength fields found.");
  }
  for (let index = 1; index < wavelengthFields.length; index += 1) {
    if (wavelengthFields[index] <= wavelengthFields[index - 1]) {
      throw new CgatsImportError("Spectral wavelengths must be strictly increasing.");
    }
  }

  const declaredSets = parseTrailingInteger(
    lines.find((line) => line.startsWith("NUMBER_OF_SETS")),
  );

  const records: AtlasRecord[] = [];
  const ids = new Set<string>();

  for (const [offset, line] of lines.slice(dataStart + 1, dataEnd).entries()) {
    const columns = line.split(/\s+/);
    if (columns.length !== fields.length) {
      throw new CgatsImportError(
        `Row ${offset + 1} has ${columns.length} fields; expected ${fields.length}.`,
      );
    }

    const atlasId = columns[0];
    assertAtlasId(atlasId);
    if (ids.has(atlasId)) throw new CgatsImportError(`Duplicate atlas ID: ${atlasId}`);
    ids.add(atlasId);

    const reflectance = columns.slice(1).map((value, index) => {
      const parsed = Number(value.replace(",", "."));
      if (!Number.isFinite(parsed)) {
        throw new CgatsImportError(
          `Invalid reflectance at ${atlasId}, ${wavelengthFields[index]} nm.`,
        );
      }
      if (parsed < 0 || parsed > 1) {
        throw new CgatsImportError(
          `Reflectance outside 0..1 at ${atlasId}, ${wavelengthFields[index]} nm.`,
        );
      }
      return parsed;
    });

    records.push({
      atlasId,
      lab: parseHlcLab(atlasId),
      spectrum: {
        wavelengthsNm: wavelengthFields,
        reflectance,
        source: options.spectralSource ?? "OPTIMIZED",
      },
      sourceRow: offset + 1,
    });
  }

  if (declaredSets !== undefined && records.length !== declaredSets) {
    throw new CgatsImportError(
      `CGATS declares ${declaredSets} sets but contains ${records.length}.`,
    );
  }

  const expectedCount = options.metadata.recordCount ?? declaredSets;
  if (expectedCount !== undefined && records.length !== expectedCount) {
    throw new CgatsImportError(
      `Expected ${expectedCount} records but imported ${records.length}.`,
    );
  }

  return {
    metadata: {
      ...options.metadata,
      recordCount: records.length,
    },
    records,
  };
}
