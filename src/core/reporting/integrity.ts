import { createHash } from "node:crypto";
import type { MixLockReportModel } from "./mixlock-report";

export interface MixLockReportEnvelope {
  readonly schemaVersion: "ARBE_MIXLOCK_REPORT_ENVELOPE_V1";
  readonly report: MixLockReportModel;
  readonly reportSha256: string;
  readonly integrityMethod: "SHA256_CANONICAL_JSON";
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .filter((key) => record[key] !== undefined)
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

export function canonicalReportJson(report: MixLockReportModel): string {
  return JSON.stringify(canonicalize(report));
}

export function computeReportSha256(report: MixLockReportModel): string {
  return createHash("sha256").update(canonicalReportJson(report), "utf8").digest("hex");
}

export function createMixLockReportEnvelope(report: MixLockReportModel): MixLockReportEnvelope {
  return {
    schemaVersion: "ARBE_MIXLOCK_REPORT_ENVELOPE_V1",
    report,
    reportSha256: computeReportSha256(report),
    integrityMethod: "SHA256_CANONICAL_JSON",
  };
}

export function verifyMixLockReportEnvelope(envelope: MixLockReportEnvelope): boolean {
  return /^[a-f0-9]{64}$/.test(envelope.reportSha256) &&
    computeReportSha256(envelope.report) === envelope.reportSha256;
}
