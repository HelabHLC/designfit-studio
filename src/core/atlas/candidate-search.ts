import type { LabColor } from "../reference";
import type { AtlasDataset, AtlasRecord } from "./types";

export type AtlasDistanceMethod = "CIE76";

export interface AtlasCandidate {
  readonly rank: number;
  readonly record: AtlasRecord;
  readonly distance: number;
  readonly method: AtlasDistanceMethod;
}

export interface AtlasCandidateSearchOptions {
  readonly limit?: number;
  readonly method?: AtlasDistanceMethod;
}

function cie76(left: LabColor, right: LabColor): number {
  return Math.hypot(
    left.l - right.l,
    left.a - right.a,
    left.b - right.b,
  );
}

export function findAtlasCandidates(
  dataset: AtlasDataset,
  target: LabColor,
  options: AtlasCandidateSearchOptions = {},
): readonly AtlasCandidate[] {
  const limit = options.limit ?? 10;
  const method = options.method ?? "CIE76";

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`Candidate limit must be a positive integer, got ${limit}.`);
  }

  if (method !== "CIE76") {
    throw new Error(`Unsupported distance method: ${method}.`);
  }

  return dataset.records
    .map((record) => ({ record, distance: cie76(target, record.lab) }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.record.atlasId.localeCompare(right.record.atlasId),
    )
    .slice(0, limit)
    .map(({ record, distance }, index) => ({
      rank: index + 1,
      record,
      distance,
      method,
    }));
}
