import { createHash, timingSafeEqual } from "node:crypto";
import {
  createReferenceGatewayEvidenceChain,
  type ReferenceGatewayEvidenceChain,
  verifyReferenceGatewayEvidenceChain,
} from "./evidence-chain";
import {
  createReferenceGatewayRuntimeTrace,
  type ReferenceGatewayRuntimeTrace,
} from "./runtime-trace";
import type { ReferenceGatewayResult } from "./types";

export interface ReferenceGatewayDecisionPayload {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_DECISION_V1";
  readonly requestKind: ReferenceGatewayResult["request"]["kind"];
  readonly identityRule: "REQUEST_ONLY";
  readonly status: ReferenceGatewayResult["status"];
  readonly boundReference?: string;
  readonly bindingMethod?: ReferenceGatewayResult["bindingMethod"];
  readonly candidateCount: number;
  readonly evidenceSha256: string;
  readonly traceSchema: "ARBE_REFERENCE_GATEWAY_RUNTIME_TRACE_V1";
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface ReferenceGatewayDecisionIntegrity {
  readonly algorithm: "SHA-256";
  readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
  readonly payloadSha256: string;
}

export interface ReferenceGatewayDecisionObject {
  readonly payload: ReferenceGatewayDecisionPayload;
  readonly gatewayResult: ReferenceGatewayResult;
  readonly evidenceChain: ReferenceGatewayEvidenceChain;
  readonly runtimeTrace: ReferenceGatewayRuntimeTrace;
  readonly integrity: ReferenceGatewayDecisionIntegrity;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical decision JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical decision value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function canonicalizeReferenceGatewayDecision(payload: ReferenceGatewayDecisionPayload): string {
  return canonicalizeValue(payload);
}

export function computeReferenceGatewayDecisionSha256(payload: ReferenceGatewayDecisionPayload): string {
  return createHash("sha256").update(canonicalizeReferenceGatewayDecision(payload), "utf8").digest("hex");
}

export function createReferenceGatewayDecisionObject(
  gatewayResult: ReferenceGatewayResult,
): ReferenceGatewayDecisionObject {
  const evidenceChain = createReferenceGatewayEvidenceChain(gatewayResult);
  const runtimeTrace = createReferenceGatewayRuntimeTrace(evidenceChain);
  const payload: ReferenceGatewayDecisionPayload = {
    schemaVersion: "ARBE_REFERENCE_GATEWAY_DECISION_V1",
    requestKind: gatewayResult.request.kind,
    identityRule: gatewayResult.request.identityRule,
    status: gatewayResult.status,
    boundReference: gatewayResult.boundReference,
    bindingMethod: gatewayResult.bindingMethod,
    candidateCount: gatewayResult.candidates.length,
    evidenceSha256: evidenceChain.integrity.payloadSha256,
    traceSchema: runtimeTrace.schemaVersion,
    claimBoundary: gatewayResult.claimBoundary,
    limitations: gatewayResult.limitations,
  };

  return deepFreeze({
    payload,
    gatewayResult,
    evidenceChain,
    runtimeTrace,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeReferenceGatewayDecisionSha256(payload),
    },
  });
}

export function verifyReferenceGatewayDecisionObject(decision: ReferenceGatewayDecisionObject): boolean {
  if (
    decision.payload.schemaVersion !== "ARBE_REFERENCE_GATEWAY_DECISION_V1" ||
    decision.integrity.algorithm !== "SHA-256" ||
    decision.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(decision.integrity.payloadSha256) ||
    !verifyReferenceGatewayEvidenceChain(decision.evidenceChain)
  ) return false;

  if (
    decision.payload.evidenceSha256 !== decision.evidenceChain.integrity.payloadSha256 ||
    decision.runtimeTrace.sourceEvidenceSha256 !== decision.evidenceChain.integrity.payloadSha256 ||
    decision.payload.traceSchema !== decision.runtimeTrace.schemaVersion ||
    decision.payload.status !== decision.gatewayResult.status ||
    decision.payload.boundReference !== decision.gatewayResult.boundReference ||
    decision.payload.bindingMethod !== decision.gatewayResult.bindingMethod ||
    decision.payload.candidateCount !== decision.gatewayResult.candidates.length ||
    decision.payload.requestKind !== decision.gatewayResult.request.kind ||
    decision.payload.identityRule !== decision.gatewayResult.request.identityRule
  ) return false;

  const expected = Buffer.from(computeReferenceGatewayDecisionSha256(decision.payload), "hex");
  const supplied = Buffer.from(decision.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
