import { createHash, timingSafeEqual } from "node:crypto";
import type { RuntimeEvidenceChainVerificationResult } from "./runtime-evidence-chain-verification";

export interface RuntimeEvidenceChainVerificationReport {
  readonly payload: {
    readonly schemaVersion: "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_REPORT_V1";
    readonly reportType: "REFERENCE_BOUND_RUNTIME_CHAIN_VERIFICATION";
    readonly targetReference: string;
    readonly verificationStatus: RuntimeEvidenceChainVerificationResult["status"];
    readonly verifiedFindingCount: number;
    readonly failedFindingCount: number;
    readonly verificationResult: RuntimeEvidenceChainVerificationResult;
    readonly boundary: string;
  };
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Verification report JSON rejects non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported verification report value: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(result: RuntimeEvidenceChainVerificationResult): void {
  if (result.schemaVersion !== "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_V1") throw new Error("Unsupported verification schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(result.targetReference)) throw new Error("Verification report reference must match Hxxx_Lxxx_Cxxx.");
  if (result.findings.length !== 5) throw new Error("Verification report requires exactly five findings.");
  const pass = result.findings.filter((finding) => finding.status === "PASS").length;
  const fail = result.findings.filter((finding) => finding.status === "FAIL").length;
  if (pass !== result.verifiedFindingCount || fail !== result.failedFindingCount) throw new Error("Verification finding counts are inconsistent.");
  if ((result.status === "VERIFIED") !== (fail === 0)) throw new Error("Verification status is inconsistent with findings.");
}

export function computeRuntimeEvidenceChainVerificationReportSha256(payload: RuntimeEvidenceChainVerificationReport["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRuntimeEvidenceChainVerificationReport(result: RuntimeEvidenceChainVerificationResult): RuntimeEvidenceChainVerificationReport {
  validate(result);
  const payload: RuntimeEvidenceChainVerificationReport["payload"] = {
    schemaVersion: "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_REPORT_V1",
    reportType: "REFERENCE_BOUND_RUNTIME_CHAIN_VERIFICATION",
    targetReference: result.targetReference,
    verificationStatus: result.status,
    verifiedFindingCount: result.verifiedFindingCount,
    failedFindingCount: result.failedFindingCount,
    verificationResult: result,
    boundary: "This report binds a runtime evidence-chain verification result. It does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeRuntimeEvidenceChainVerificationReportSha256(payload),
    },
  });
}

export function verifyRuntimeEvidenceChainVerificationReport(report: RuntimeEvidenceChainVerificationReport): boolean {
  const { payload, integrity } = report;
  if (payload.schemaVersion !== "ARBE_RUNTIME_EVIDENCE_CHAIN_VERIFICATION_REPORT_V1" || payload.reportType !== "REFERENCE_BOUND_RUNTIME_CHAIN_VERIFICATION") return false;
  if (payload.targetReference !== payload.verificationResult.targetReference || payload.verificationStatus !== payload.verificationResult.status) return false;
  if (payload.verifiedFindingCount !== payload.verificationResult.verifiedFindingCount || payload.failedFindingCount !== payload.verificationResult.failedFindingCount) return false;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  try { validate(payload.verificationResult); } catch { return false; }
  const expected = Buffer.from(computeRuntimeEvidenceChainVerificationReportSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
