import { createHash, timingSafeEqual } from "node:crypto";
import type { MixLockReportModel } from "./mixlock-report";

export interface MixLockReportIntegrity {
  readonly algorithm: "SHA-256";
  readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
  readonly payloadSha256: string;
}

export interface MixLockReportEnvelope {
  readonly schemaVersion: "ARBE_MIXLOCK_REPORT_ENVELOPE_V1";
  readonly report: MixLockReportModel;
  readonly integrity: MixLockReportIntegrity;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeValue(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical JSON value type: ${typeof value}.`);
}

export function canonicalizeMixLockReport(report: MixLockReportModel): string {
  return canonicalizeValue(report);
}

export function computeMixLockReportSha256(report: MixLockReportModel): string {
  return createHash("sha256").update(canonicalizeMixLockReport(report), "utf8").digest("hex");
}

export function createMixLockReportEnvelope(report: MixLockReportModel): MixLockReportEnvelope {
  return {
    schemaVersion: "ARBE_MIXLOCK_REPORT_ENVELOPE_V1",
    report,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeMixLockReportSha256(report),
    },
  };
}

export function verifyMixLockReportEnvelope(envelope: MixLockReportEnvelope): boolean {
  if (
    envelope.schemaVersion !== "ARBE_MIXLOCK_REPORT_ENVELOPE_V1" ||
    envelope.integrity.algorithm !== "SHA-256" ||
    envelope.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(envelope.integrity.payloadSha256)
  ) return false;

  const expected = Buffer.from(computeMixLockReportSha256(envelope.report), "hex");
  const supplied = Buffer.from(envelope.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
