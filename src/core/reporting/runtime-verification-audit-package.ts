import { createHash, timingSafeEqual } from "node:crypto";
import {
  verifyRuntimeIntelligenceEvidencePackage,
  type RuntimeIntelligenceEvidencePackage,
} from "./runtime-intelligence-evidence-package";
import { verifyRuntimeEvidenceChain } from "./runtime-evidence-chain-verification";
import {
  verifyRuntimeEvidenceChainVerificationReport,
  type RuntimeEvidenceChainVerificationReport,
} from "./runtime-evidence-chain-verification-report";

export interface RuntimeVerificationAuditPackage {
  readonly payload: {
    readonly schemaVersion: "ARBE_RUNTIME_VERIFICATION_AUDIT_PACKAGE_V1";
    readonly packageType: "REFERENCE_BOUND_RUNTIME_VERIFICATION_AUDIT";
    readonly targetReference: string;
    readonly verificationStatus: "VERIFIED" | "REJECTED";
    readonly runtimeEvidencePackageSha256: string;
    readonly verificationReportSha256: string;
    readonly runtimeEvidencePackage: RuntimeIntelligenceEvidencePackage;
    readonly verificationReport: RuntimeEvidenceChainVerificationReport;
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
    if (!Number.isFinite(value)) throw new Error("Audit package JSON rejects non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported audit package value: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(
  runtimePackage: RuntimeIntelligenceEvidencePackage,
  verificationReport: RuntimeEvidenceChainVerificationReport,
): void {
  if (!verifyRuntimeIntelligenceEvidencePackage(runtimePackage)) throw new Error("Runtime evidence package integrity failed.");
  if (!verifyRuntimeEvidenceChainVerificationReport(verificationReport)) throw new Error("Verification report integrity failed.");
  if (runtimePackage.payload.targetReference !== verificationReport.payload.targetReference) throw new Error("Audit package references do not match.");
  const expected = verifyRuntimeEvidenceChain(runtimePackage);
  const supplied = verificationReport.payload.verificationResult;
  if (canonical(expected) !== canonical(supplied)) throw new Error("Verification report does not describe the supplied runtime evidence package.");
}

export function computeRuntimeVerificationAuditPackageSha256(payload: RuntimeVerificationAuditPackage["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRuntimeVerificationAuditPackage(
  runtimeEvidencePackage: RuntimeIntelligenceEvidencePackage,
  verificationReport: RuntimeEvidenceChainVerificationReport,
): RuntimeVerificationAuditPackage {
  validate(runtimeEvidencePackage, verificationReport);
  const payload: RuntimeVerificationAuditPackage["payload"] = {
    schemaVersion: "ARBE_RUNTIME_VERIFICATION_AUDIT_PACKAGE_V1",
    packageType: "REFERENCE_BOUND_RUNTIME_VERIFICATION_AUDIT",
    targetReference: runtimeEvidencePackage.payload.targetReference,
    verificationStatus: verificationReport.payload.verificationStatus,
    runtimeEvidencePackageSha256: runtimeEvidencePackage.integrity.payloadSha256,
    verificationReportSha256: verificationReport.integrity.payloadSha256,
    runtimeEvidencePackage,
    verificationReport,
    boundary: "This audit package preserves runtime evidence and its verification result. VERIFIED means internal chain consistency only and does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeRuntimeVerificationAuditPackageSha256(payload),
    },
  });
}

export function verifyRuntimeVerificationAuditPackage(value: RuntimeVerificationAuditPackage): boolean {
  const { payload, integrity } = value;
  if (payload.schemaVersion !== "ARBE_RUNTIME_VERIFICATION_AUDIT_PACKAGE_V1" || payload.packageType !== "REFERENCE_BOUND_RUNTIME_VERIFICATION_AUDIT") return false;
  if (payload.targetReference !== payload.runtimeEvidencePackage.payload.targetReference || payload.targetReference !== payload.verificationReport.payload.targetReference) return false;
  if (payload.verificationStatus !== payload.verificationReport.payload.verificationStatus) return false;
  if (payload.runtimeEvidencePackageSha256 !== payload.runtimeEvidencePackage.integrity.payloadSha256) return false;
  if (payload.verificationReportSha256 !== payload.verificationReport.integrity.payloadSha256) return false;
  try { validate(payload.runtimeEvidencePackage, payload.verificationReport); } catch { return false; }
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  const expected = Buffer.from(computeRuntimeVerificationAuditPackageSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
