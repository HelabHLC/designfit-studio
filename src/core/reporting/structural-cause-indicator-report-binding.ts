import { createHash, timingSafeEqual } from "node:crypto";
import type { StructuralCauseIndicatorsResult } from "../spectral-intelligence";
import {
  verifyReferenceGatewayEvidenceReport,
  type ReferenceGatewayEvidenceReport,
} from "./reference-gateway-evidence-report";

export interface StructuralCauseIndicatorReportBindingPayload {
  readonly schemaVersion: "ARBE_STRUCTURAL_CAUSE_INDICATOR_REPORT_BINDING_V1";
  readonly reportType: "REFERENCE_GATEWAY_WITH_STRUCTURAL_CAUSE_INDICATORS";
  readonly gatewayReportSha256: string;
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly targetReference: string;
  readonly indicatorStatus: StructuralCauseIndicatorsResult["status"];
  readonly indicatorCount: number;
  readonly investigationCandidateCount: number;
  readonly causeIndicators: StructuralCauseIndicatorsResult;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface StructuralCauseIndicatorReportBinding {
  readonly payload: StructuralCauseIndicatorReportBindingPayload;
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical cause-indicator report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical cause-indicator report value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function computeStructuralCauseIndicatorReportBindingSha256(
  payload: StructuralCauseIndicatorReportBindingPayload,
): string {
  return createHash("sha256").update(canonicalizeValue(payload), "utf8").digest("hex");
}

export function createStructuralCauseIndicatorReportBinding(
  gatewayReport: ReferenceGatewayEvidenceReport,
  causeIndicators: StructuralCauseIndicatorsResult,
): StructuralCauseIndicatorReportBinding {
  if (!verifyReferenceGatewayEvidenceReport(gatewayReport)) {
    throw new Error("Reference Gateway Evidence Report integrity verification failed.");
  }
  const boundReference = gatewayReport.payload.boundReference;
  if (!boundReference) throw new Error("Structural cause indicators require a bound ARBE reference.");
  if (boundReference !== causeIndicators.targetReference) {
    throw new Error(`Cause-indicator report target mismatch: expected ${boundReference}, received ${causeIndicators.targetReference}.`);
  }
  if (!causeIndicators.investigationCandidates.every(
    (candidate) => candidate.boundary === "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE",
  )) {
    throw new Error("Every investigation candidate must retain the not-root-cause boundary.");
  }

  const payload: StructuralCauseIndicatorReportBindingPayload = {
    schemaVersion: "ARBE_STRUCTURAL_CAUSE_INDICATOR_REPORT_BINDING_V1",
    reportType: "REFERENCE_GATEWAY_WITH_STRUCTURAL_CAUSE_INDICATORS",
    gatewayReportSha256: gatewayReport.integrity.payloadSha256,
    decisionSha256: gatewayReport.payload.decisionSha256,
    evidenceSha256: gatewayReport.payload.evidenceSha256,
    targetReference: causeIndicators.targetReference,
    indicatorStatus: causeIndicators.status,
    indicatorCount: causeIndicators.indicators.length,
    investigationCandidateCount: causeIndicators.investigationCandidates.length,
    causeIndicators,
    claimBoundary: "This binding records structural indicators and investigation candidates, not root-cause findings. It does not identify materials or faults and does not grant production release.",
    limitations: [
      ...causeIndicators.limitations,
      "Gateway evidence and structural cause indicators must refer to the same existing ARBE reference.",
      "Investigation candidates are bounded review directions, not probability rankings or confirmed causes.",
    ],
  };

  return deepFreeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeStructuralCauseIndicatorReportBindingSha256(payload),
    },
  });
}

export function verifyStructuralCauseIndicatorReportBinding(
  report: StructuralCauseIndicatorReportBinding,
): boolean {
  if (
    report.payload.schemaVersion !== "ARBE_STRUCTURAL_CAUSE_INDICATOR_REPORT_BINDING_V1" ||
    report.payload.reportType !== "REFERENCE_GATEWAY_WITH_STRUCTURAL_CAUSE_INDICATORS" ||
    report.integrity.algorithm !== "SHA-256" ||
    report.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(report.integrity.payloadSha256) ||
    !/^[a-f0-9]{64}$/.test(report.payload.gatewayReportSha256) ||
    report.payload.targetReference !== report.payload.causeIndicators.targetReference ||
    report.payload.indicatorStatus !== report.payload.causeIndicators.status ||
    report.payload.indicatorCount !== report.payload.causeIndicators.indicators.length ||
    report.payload.investigationCandidateCount !== report.payload.causeIndicators.investigationCandidates.length ||
    !report.payload.causeIndicators.investigationCandidates.every(
      (candidate) => candidate.boundary === "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE",
    )
  ) return false;

  const expected = Buffer.from(computeStructuralCauseIndicatorReportBindingSha256(report.payload), "hex");
  const supplied = Buffer.from(report.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
