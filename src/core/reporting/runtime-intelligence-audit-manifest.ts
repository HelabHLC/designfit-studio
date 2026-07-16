import { createHash, timingSafeEqual } from "node:crypto";
import { verifyRuntimeVerificationAuditPackage, type RuntimeVerificationAuditPackage } from "./runtime-verification-audit-package";

export interface RuntimeIntelligenceAuditManifest {
  readonly payload: {
    readonly schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_AUDIT_MANIFEST_V1";
    readonly targetReference: string;
    readonly verificationStatus: "VERIFIED" | "REJECTED";
    readonly sourceHashes: readonly [string, string, string];
    readonly auditPackage: RuntimeVerificationAuditPackage;
    readonly boundary: string;
  };
  readonly integrity: { readonly algorithm: "SHA-256"; readonly payloadSha256: string };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

export function computeRuntimeIntelligenceAuditManifestSha256(payload: RuntimeIntelligenceAuditManifest["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRuntimeIntelligenceAuditManifest(auditPackage: RuntimeVerificationAuditPackage): RuntimeIntelligenceAuditManifest {
  if (!verifyRuntimeVerificationAuditPackage(auditPackage)) throw new Error("Runtime verification audit package integrity failed.");
  const payload: RuntimeIntelligenceAuditManifest["payload"] = {
    schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_AUDIT_MANIFEST_V1",
    targetReference: auditPackage.payload.targetReference,
    verificationStatus: auditPackage.payload.verificationStatus,
    sourceHashes: [
      auditPackage.payload.runtimeEvidencePackageSha256,
      auditPackage.payload.verificationReportSha256,
      auditPackage.integrity.payloadSha256,
    ],
    auditPackage,
    boundary: "Manifest integrity confirms internal audit-chain consistency only; it grants no scientific, recipe or production approval.",
  };
  return freeze({ payload, integrity: { algorithm: "SHA-256", payloadSha256: computeRuntimeIntelligenceAuditManifestSha256(payload) } });
}

export function verifyRuntimeIntelligenceAuditManifest(manifest: RuntimeIntelligenceAuditManifest): boolean {
  const { payload, integrity } = manifest;
  if (payload.schemaVersion !== "ARBE_RUNTIME_INTELLIGENCE_AUDIT_MANIFEST_V1") return false;
  if (!verifyRuntimeVerificationAuditPackage(payload.auditPackage)) return false;
  if (payload.targetReference !== payload.auditPackage.payload.targetReference || payload.verificationStatus !== payload.auditPackage.payload.verificationStatus) return false;
  const expected = [payload.auditPackage.payload.runtimeEvidencePackageSha256, payload.auditPackage.payload.verificationReportSha256, payload.auditPackage.integrity.payloadSha256];
  if (!payload.sourceHashes.every((hash, index) => hash === expected[index])) return false;
  if (integrity.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  const left = Buffer.from(computeRuntimeIntelligenceAuditManifestSha256(payload), "hex");
  const right = Buffer.from(integrity.payloadSha256, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
