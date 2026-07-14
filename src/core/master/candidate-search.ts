import type { LabColor } from "../reference";
import type { MasterRecord, MasterRepository } from "./types";

export interface MasterCandidate {
  readonly rank: number;
  readonly reference: string;
  readonly lab: LabColor;
  readonly distance: number;
  readonly method: "CIE76";
  readonly record: MasterRecord;
}

export interface MasterCandidateSearchOptions {
  readonly limit?: number;
}

function assertLab(value: LabColor): void {
  for (const [name, component] of Object.entries(value)) {
    if (typeof component !== "number" || !Number.isFinite(component)) {
      throw new Error(`Lab component ${name} must be finite.`);
    }
  }
}

function cie76(left: LabColor, right: LabColor): number {
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

export async function findMasterCandidates(
  repository: MasterRepository,
  target: LabColor,
  options: MasterCandidateSearchOptions = {},
): Promise<readonly MasterCandidate[]> {
  assertLab(target);
  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error(`Candidate limit must be an integer from 1 to 50, got ${limit}.`);
  }

  const records = await repository.listRecords();
  return records
    .map((record) => ({ record, distance: cie76(target, record.lab) }))
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        left.record.reference.localeCompare(right.record.reference),
    )
    .slice(0, limit)
    .map(({ record, distance }, index) => ({
      rank: index + 1,
      reference: record.reference,
      lab: record.lab,
      distance,
      method: "CIE76" as const,
      record,
    }));
}
