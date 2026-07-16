import { createHash, timingSafeEqual } from "node:crypto";
import {
  verifySpectralIntelligenceReportBinding,
  type SpectralIntelligenceReportBinding,
} from "./spectral-intelligence-report-binding";
import {
  verifyStructuralCauseIndicatorReportBinding,
  type StructuralCauseIndicatorReportBinding,
} from "./structural-cause-indicator-report-binding";

export interface SpectralIntelligenceEvidencePackagePayload {
  readonly schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_EVIDENCE_PACKAGE_V1";
  readonly packageType: "REFERENCE_BOUND_SPECTRAL_INTELLIGENCE_EVIDENCE";
  readonly targetReference: string;
  readonly gatewayReportSha256: string;
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly spectralReportSha256: string;
  readonly causeIndicatorReportSha256: string;
  readonly spectralReport: SpectralIntelligenceReportBinding;
  readonly causeIndicatorReport: StructuralCauseIndicatorReportBinding;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface SpectralIntelligenceEvidencePackage {
  readonly payload: SpectralIntelligenceEvidencePackagePayload;
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical evidence-package JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical evidence-package value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function computeSpectralIntelligenceEvidencePackageSha256(
  payload: SpectralIntelligenceEvidencePackagePayload,
): string {
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

export function createSpectralIntelligenceEvidencePackage(
  spectralReport: SpectralIntelligenceReportBinding,
  causeIndicatorReport: StructuralCauseIndicatorReportBinding,
): SpectralIntelligenceEvidencePackage {
  if (!verifySpectralIntelligenceReportBinding(spectralReport)) {
    throw new Error("Spectral Intelligence Report Binding integrity verification failed.");
  }
  if (!verifyStructuralCauseIndicatorReportBinding(causeIndicatorReport)) {
    throw new Error("Structural Cause Indicator Report Binding integrity verification failed.");
  }

  const spectral = spectralReport.payload;
  const cause = causeIndicatorReport.payload;
  if (spectral.targetReference !== cause.targetReference) {
    throw new Error(`Evidence-package target mismatch: ${spectral.targetReference} versus ${cause.targetReference}.`);
  }
  if (
    spectral.gatewayReportSha256 !== cause.gatewayReportSha256 ||
    spectral.decisionSha256 !== cause.decisionSha256 ||
    spectral.evidenceSha256 !== cause.evidenceSha256
  ) {
    throw new Error("Evidence-package reports do not share the same verified Gateway evidence chain.");
  }

  const payload: SpectralIntelligenceEvidencePackagePayload = {
    schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_EVIDENCE_PACKAGE_V1",
    packageType: "REFERENCE_BOUND_SPECTRAL_INTELLIGENCE_EVIDENCE",
    targetReference: spectral.targetReference,
    gatewayReportSha256: spectral.gatewayReportSha256,
    decisionSha256: spectral.decisionSha256,
    evidenceSha256: spectral.evidenceSha256,
    spectralReportSha256: spectralReport.integrity.payloadSha256,
    causeIndicatorReportSha256: causeIndicatorReport.integrity.payloadSha256,
    spectralReport,
    causeIndicatorReport,
    claimBoundary: "This package preserves verified spectral evidence and bounded investigation candidates. It does not establish root cause, certify equivalence, approve a recipe or grant production release.",
    limitations: [
      "Both reports must refer to the same existing ARBE reference and the same verified Gateway evidence chain.",
      "Investigation candidates remain bounded review directions and are not confirmed causes or probability rankings.",
      "Package integrity proves payload consistency, not scientific validation for a specific production process.",
    ],
  };

  return deepFreeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeSpectralIntelligenceEvidencePackageSha256(payload),
    },
  });
}

export function verifySpectralIntelligenceEvidencePackage(
  evidencePackage: SpectralIntelligenceEvidencePackage,
): boolean {
  const payload = evidencePackage.payload;
  if (
    payload.schemaVersion !== "ARBE_SPECTRAL_INTELLIGENCE_EVIDENCE_PACKAGE_V1" ||
    payload.packageType !== "REFERENCE_BOUND_SPECTRAL_INTELLIGENCE_EVIDENCE" ||
    evidencePackage.integrity.algorithm !== "SHA-256" ||
    evidencePackage.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(evidencePackage.integrity.payloadSha256) ||
    !verifySpectralIntelligenceReportBinding(payload.spectralReport) ||
    !verifyStructuralCauseIndicatorReportBinding(payload.causeIndicatorReport) ||
    payload.targetReference !== payload.spectralReport.payload.targetReference ||
    payload.targetReference !== payload.causeIndicatorReport.payload.targetReference ||
    payload.gatewayReportSha256 !== payload.spectralReport.payload.gatewayReportSha256 ||
    payload.gatewayReportSha256 !== payload.causeIndicatorReport.payload.gatewayReportSha256 ||
    payload.spectralReportSha256 !== payload.spectralReport.integrity.payloadSha256 ||
    payload.causeIndicatorReportSha256 !== payload.causeIndicatorReport.integrity.payloadSha256
  ) return false;

  const expected = Buffer.from(computeSpectralIntelligenceEvidencePackageSha256(payload), "hex");
  const supplied = Buffer.from(evidencePackage.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
