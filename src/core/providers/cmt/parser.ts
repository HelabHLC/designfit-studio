import { createHash } from "node:crypto";

import type {
  CmtRsImportOptions,
  CmtSpectralDataset,
  CmtSpectralRecord,
} from "./types";

const DEFAULT_WAVELENGTH_START_NM = 380;
const DEFAULT_WAVELENGTH_STEP_NM = 10;
const DEFAULT_EXPECTED_SAMPLE_COUNT = 36;
const QUOTED_ROW = /^"((?:[^"]|"")*)"\t(.+)$/;

export class CmtRsImportError extends Error {
  readonly sourceRow?: number;

  constructor(message: string, sourceRow?: number) {
    super(sourceRow === undefined ? message : `Row ${sourceRow}: ${message}`);
    this.name = "CmtRsImportError";
    this.sourceRow = sourceRow;
  }
}

function sha256Utf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeSourceText(sourceText: string): string {
  return sourceText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

function buildWavelengths(
  startNm: number,
  stepNm: number,
  sampleCount: number,
): readonly number[] {
  if (!Number.isInteger(startNm) || startNm <= 0) {
    throw new CmtRsImportError("wavelengthStartNm must be a positive integer.");
  }
  if (!Number.isInteger(stepNm) || stepNm <= 0) {
    throw new CmtRsImportError("wavelengthStepNm must be a positive integer.");
  }
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    throw new CmtRsImportError("expectedSampleCount must be a positive integer.");
  }

  return Array.from({ length: sampleCount }, (_, index) => startNm + index * stepNm);
}

function parseReflectance(value: string, sourceRow: number, sampleIndex: number): number {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new CmtRsImportError(
      `Invalid reflectance value at sample ${sampleIndex + 1}.`,
      sourceRow,
    );
  }
  if (parsed < 0 || parsed > 1) {
    throw new CmtRsImportError(
      `Reflectance outside 0..1 at sample ${sampleIndex + 1}.`,
      sourceRow,
    );
  }
  return parsed;
}

function makeRecordId(datasetId: string, sourceRow: number, name: string): string {
  const digest = sha256Utf8(`${datasetId}\u0000${sourceRow}\u0000${name}`).slice(0, 16);
  return `${datasetId}:${sourceRow.toString().padStart(6, "0")}:${digest}`;
}

function parseRow(
  line: string,
  sourceRow: number,
  datasetId: string,
  wavelengthsNm: readonly number[],
): CmtSpectralRecord {
  const match = QUOTED_ROW.exec(line);
  if (!match) {
    throw new CmtRsImportError(
      "Expected a quoted sample name followed by tab-separated reflectance values.",
      sourceRow,
    );
  }

  const name = match[1].replace(/""/g, '"').trim();
  if (!name) throw new CmtRsImportError("Sample name must not be empty.", sourceRow);

  const values = match[2].split("\t");
  if (values.length !== wavelengthsNm.length) {
    throw new CmtRsImportError(
      `Found ${values.length} spectral values; expected ${wavelengthsNm.length}.`,
      sourceRow,
    );
  }

  const reflectance = values.map((value, index) =>
    parseReflectance(value.trim(), sourceRow, index),
  );

  return {
    recordId: makeRecordId(datasetId, sourceRow, name),
    sourceRow,
    name,
    wavelengthsNm,
    reflectance,
  };
}

export function importCmtRsDataset(
  sourceText: string,
  options: CmtRsImportOptions,
): CmtSpectralDataset {
  if (!options.datasetId.trim()) throw new CmtRsImportError("datasetId must not be empty.");
  if (!options.title.trim()) throw new CmtRsImportError("title must not be empty.");
  if (!options.version.trim()) throw new CmtRsImportError("version must not be empty.");
  if (!options.sourceFileName.trim()) {
    throw new CmtRsImportError("sourceFileName must not be empty.");
  }

  const normalizedSource = normalizeSourceText(sourceText);
  const expectedSampleCount =
    options.expectedSampleCount ?? DEFAULT_EXPECTED_SAMPLE_COUNT;
  const wavelengthsNm = buildWavelengths(
    options.wavelengthStartNm ?? DEFAULT_WAVELENGTH_START_NM,
    options.wavelengthStepNm ?? DEFAULT_WAVELENGTH_STEP_NM,
    expectedSampleCount,
  );

  const records = normalizedSource
    .split("\n")
    .map((line, index) => ({ line, sourceRow: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, sourceRow }) =>
      parseRow(line, sourceRow, options.datasetId, wavelengthsNm),
    );

  if (records.length === 0) {
    throw new CmtRsImportError("The .rs source contains no spectral records.");
  }

  const names = new Set<string>();
  for (const record of records) {
    if (names.has(record.name)) {
      throw new CmtRsImportError(`Duplicate sample name: ${record.name}`, record.sourceRow);
    }
    names.add(record.name);
  }

  return {
    sourceFileName: options.sourceFileName,
    provenance: {
      datasetId: options.datasetId,
      title: options.title,
      version: options.version,
      dataClass: "RESTRICTED_INTERNAL",
      sourceName: options.sourceName ?? "Color Mixing Tools / University of Brescia",
      sourceUrl: options.sourceUrl,
      licenceTextPath: "docs/legal/permissions/cmt-data-permission.md",
      redistributionConfirmed: false,
      recordCount: records.length,
      wavelengthsNm,
      sourceSha256: sha256Utf8(normalizedSource),
      createdAt: options.createdAt,
      notes:
        options.notes ??
        "Authorised for research and educational use with attribution; commercial redistribution is not confirmed.",
    },
    records,
  };
}
