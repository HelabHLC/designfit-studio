import { assertAtlasId } from "../reference";
import type { AtlasDataset, AtlasDatasetMetadata, AtlasRecord } from "./types";

export interface AtlasCsvImportOptions {
  readonly metadata: Omit<AtlasDatasetMetadata, "recordCount">;
  readonly delimiter?: "," | ";" | "\t";
}

const REQUIRED_COLUMNS = ["atlasId", "L", "a", "b"] as const;

function parseNumber(value: string, field: string, row: number): number {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${field} value at CSV row ${row}: "${value}".`);
  }
  return parsed;
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((value) => value.trim().replace(/^"|"$/g, ""));
}

export function importAtlasCsv(
  csv: string,
  options: AtlasCsvImportOptions,
): AtlasDataset {
  const delimiter = options.delimiter ?? ";";
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Atlas CSV must contain a header and at least one data row.");
  }

  const header = splitLine(lines[0], delimiter);
  const index = new Map(header.map((column, position) => [column, position]));

  for (const column of REQUIRED_COLUMNS) {
    if (!index.has(column)) {
      throw new Error(`Atlas CSV is missing required column "${column}".`);
    }
  }

  const records: AtlasRecord[] = lines.slice(1).map((line, offset) => {
    const sourceRow = offset + 2;
    const values = splitLine(line, delimiter);
    const get = (column: string): string => values[index.get(column) ?? -1] ?? "";
    const atlasId = get("atlasId");
    assertAtlasId(atlasId);

    return {
      atlasId,
      lab: {
        l: parseNumber(get("L"), "L", sourceRow),
        a: parseNumber(get("a"), "a", sourceRow),
        b: parseNumber(get("b"), "b", sourceRow),
      },
      hex: get("hex") || undefined,
      name: get("name") || undefined,
      sourceRow,
    };
  });

  const unique = new Set<string>();
  for (const record of records) {
    if (unique.has(record.atlasId)) {
      throw new Error(`Duplicate atlasId in dataset: ${record.atlasId}.`);
    }
    unique.add(record.atlasId);
  }

  return {
    metadata: { ...options.metadata, recordCount: records.length },
    records,
  };
}
