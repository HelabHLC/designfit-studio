import { createHash, timingSafeEqual } from "node:crypto";
import {
  createReferenceGatewayExplainableDecision,
  createReferenceGatewayTrustAssessment,
  verifyReferenceGatewayDecisionObject,
  type ReferenceGatewayDecisionObject,
  type ReferenceGatewayExplainableDecision,
  type ReferenceGatewayTrustAssessment,
} from "../reference-gateway";

export interface ReferenceGatewayEvidenceReportPayload {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_EVIDENCE_REPORT_V1";
  readonly reportType: "REFERENCE_GATEWAY_EVIDENCE_AND_TRUST";
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly requestKind: ReferenceGatewayDecisionObject["payload"]["requestKind"];
  readonly gatewayStatus: ReferenceGatewayDecisionObject["payload"]["status"];
  readonly boundReference?: string;
  readonly bindingMethod?: ReferenceGatewayDecisionObject["payload"]["bindingMethod"];
  readonly candidateCount: number;
  readonly explanation: ReferenceGatewayExplainableDecision;
  readonly trustAssessment: ReferenceGatewayTrustAssessment;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface ReferenceGatewayEvidenceReportIntegrity {
  readonly algorithm: "SHA-256";
  readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
  readonly payloadSha256: string;
}

export interface ReferenceGatewayEvidenceReport {
  readonly payload: ReferenceGatewayEvidenceReportPayload;
  readonly integrity: ReferenceGatewayEvidenceReportIntegrity;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical report value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function canonicalizeReferenceGatewayEvidenceReport(
  payload: ReferenceGatewayEvidenceReportPayload,
): string {
  return canonicalizeValue(payload);
}

export function computeReferenceGatewayEvidenceReportSha256(
  payload: ReferenceGatewayEvidenceReportPayload,
): string {
  return createHash("sha256")
    .update(canonicalizeReferenceGatewayEvidenceReport(payload), "utf8")
    .digest("hex");
}

export function createReferenceGatewayEvidenceReport(
  decision: ReferenceGatewayDecisionObject,
): ReferenceGatewayEvidenceReport {
  if (!verifyReferenceGatewayDecisionObject(decision)) {
    throw new Error("Reference Gateway Decision Object integrity verification failed.");
  }

  const explanation = createReferenceGatewayExplainableDecision(decision);
  const trustAssessment = createReferenceGatewayTrustAssessment(decision);
  const payload: ReferenceGatewayEvidenceReportPayload = {
    schemaVersion: "ARBE_REFERENCE_GATEWAY_EVIDENCE_REPORT_V1",
    reportType: "REFERENCE_GATEWAY_EVIDENCE_AND_TRUST",
    decisionSha256: decision.integrity.payloadSha256,
    evidenceSha256: decision.evidenceChain.integrity.payloadSha256,
    requestKind: decision.payload.requestKind,
    gatewayStatus: decision.payload.status,
    boundReference: decision.payload.boundReference,
    bindingMethod: decision.payload.bindingMethod,
    candidateCount: decision.payload.candidateCount,
    explanation,
    trustAssessment,
    claimBoundary: decision.payload.claimBoundary,
    limitations: decision.payload.limitations,
  };

  return deepFreeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeReferenceGatewayEvidenceReportSha256(payload),
    },
  });
}

export function verifyReferenceGatewayEvidenceReport(
  report: ReferenceGatewayEvidenceReport,
): boolean {
  if (
    report.payload.schemaVersion !== "ARBE_REFERENCE_GATEWAY_EVIDENCE_REPORT_V1" ||
    report.payload.reportType !== "REFERENCE_GATEWAY_EVIDENCE_AND_TRUST" ||
    report.integrity.algorithm !== "SHA-256" ||
    report.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(report.integrity.payloadSha256) ||
    report.payload.decisionSha256 !== report.payload.explanation.decisionSha256 ||
    report.payload.decisionSha256 !== report.payload.trustAssessment.decisionSha256 ||
    report.payload.evidenceSha256 !== report.payload.explanation.evidenceSha256 ||
    report.payload.evidenceSha256 !== report.payload.trustAssessment.evidenceSha256 ||
    report.payload.claimBoundary !== report.payload.explanation.claimBoundary ||
    report.payload.claimBoundary !== report.payload.trustAssessment.claimBoundary
  ) return false;

  const expected = Buffer.from(computeReferenceGatewayEvidenceReportSha256(report.payload), "hex");
  const supplied = Buffer.from(report.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
