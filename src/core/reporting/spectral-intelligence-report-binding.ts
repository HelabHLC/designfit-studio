import { createHash, timingSafeEqual } from "node:crypto";
import type { SpectralIntelligenceSummary } from "../spectral-intelligence";
import {
  verifyReferenceGatewayEvidenceReport,
  type ReferenceGatewayEvidenceReport,
} from "./reference-gateway-evidence-report";

export interface SpectralIntelligenceReportBindingPayload {
  readonly schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_REPORT_BINDING_V1";
  readonly reportType: "REFERENCE_GATEWAY_WITH_SPECTRAL_INTELLIGENCE";
  readonly gatewayReportSha256: string;
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly targetReference: string;
  readonly spectralOverallStatus: SpectralIntelligenceSummary["overallStatus"];
  readonly completedSpectralDomains: number;
  readonly requiredSpectralDomains: number;
  readonly spectralSummary: SpectralIntelligenceSummary;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface SpectralIntelligenceReportBindingIntegrity {
  readonly algorithm: "SHA-256";
  readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
  readonly payloadSha256: string;
}

export interface SpectralIntelligenceReportBinding {
  readonly payload: SpectralIntelligenceReportBindingPayload;
  readonly integrity: SpectralIntelligenceReportBindingIntegrity;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical spectral report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical spectral report value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function canonicalizeSpectralIntelligenceReportBinding(
  payload: SpectralIntelligenceReportBindingPayload,
): string {
  return canonicalizeValue(payload);
}

export function computeSpectralIntelligenceReportBindingSha256(
  payload: SpectralIntelligenceReportBindingPayload,
): string {
  return createHash("sha256")
    .update(canonicalizeSpectralIntelligenceReportBinding(payload), "utf8")
    .digest("hex");
}

export function createSpectralIntelligenceReportBinding(
  gatewayReport: ReferenceGatewayEvidenceReport,
  spectralSummary: SpectralIntelligenceSummary,
): SpectralIntelligenceReportBinding {
  if (!verifyReferenceGatewayEvidenceReport(gatewayReport)) {
    throw new Error("Reference Gateway Evidence Report integrity verification failed.");
  }
  if (!gatewayReport.payload.boundReference) {
    throw new Error("Spectral Intelligence requires a bound ARBE reference.");
  }
  if (gatewayReport.payload.boundReference !== spectralSummary.targetReference) {
    throw new Error(
      `Spectral report target mismatch: expected ${gatewayReport.payload.boundReference}, received ${spectralSummary.targetReference}.`,
    );
  }

  const payload: SpectralIntelligenceReportBindingPayload = {
    schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_REPORT_BINDING_V1",
    reportType: "REFERENCE_GATEWAY_WITH_SPECTRAL_INTELLIGENCE",
    gatewayReportSha256: gatewayReport.integrity.payloadSha256,
    decisionSha256: gatewayReport.payload.decisionSha256,
    evidenceSha256: gatewayReport.payload.evidenceSha256,
    targetReference: spectralSummary.targetReference,
    spectralOverallStatus: spectralSummary.overallStatus,
    completedSpectralDomains: spectralSummary.completedDomains,
    requiredSpectralDomains: spectralSummary.requiredDomains,
    spectralSummary,
    claimBoundary: "This binding connects a verified Gateway report to supplied spectral evidence. It does not grant recipe approval, certification or production release.",
    limitations: [
      ...spectralSummary.limitations,
      "The Gateway binding and spectral evidence must refer to the same existing ARBE reference.",
      "A spectral evidence pass is not a production approval.",
    ],
  };

  return deepFreeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeSpectralIntelligenceReportBindingSha256(payload),
    },
  });
}

export function verifySpectralIntelligenceReportBinding(
  report: SpectralIntelligenceReportBinding,
): boolean {
  if (
    report.payload.schemaVersion !== "ARBE_SPECTRAL_INTELLIGENCE_REPORT_BINDING_V1" ||
    report.payload.reportType !== "REFERENCE_GATEWAY_WITH_SPECTRAL_INTELLIGENCE" ||
    report.integrity.algorithm !== "SHA-256" ||
    report.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(report.integrity.payloadSha256) ||
    !/^[a-f0-9]{64}$/.test(report.payload.gatewayReportSha256) ||
    report.payload.targetReference !== report.payload.spectralSummary.targetReference ||
    report.payload.spectralOverallStatus !== report.payload.spectralSummary.overallStatus ||
    report.payload.completedSpectralDomains !== report.payload.spectralSummary.completedDomains ||
    report.payload.requiredSpectralDomains !== report.payload.spectralSummary.requiredDomains
  ) return false;

  const expected = Buffer.from(computeSpectralIntelligenceReportBindingSha256(report.payload), "hex");
  const supplied = Buffer.from(report.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
