import { createHash, timingSafeEqual } from "node:crypto";
import type { ReferenceGatewayResult } from "./types";

export type ReferenceGatewayEvidenceStepKind =
  | "REQUEST_ACCEPTED"
  | "REQUEST_NORMALIZED"
  | "COLORSPACE_TRANSFORMED"
  | "MASTER_CANDIDATES_RANKED"
  | "REFERENCE_OUTCOME_RECORDED"
  | "CLAIM_BOUNDARY_RECORDED";

export interface ReferenceGatewayEvidenceStep {
  readonly sequence: number;
  readonly kind: ReferenceGatewayEvidenceStepKind;
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface ReferenceGatewayEvidencePayload {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_EVIDENCE_V1";
  readonly requestKind: ReferenceGatewayResult["request"]["kind"];
  readonly steps: readonly ReferenceGatewayEvidenceStep[];
  readonly outcome: {
    readonly status: ReferenceGatewayResult["status"];
    readonly boundReference?: string;
    readonly bindingMethod?: ReferenceGatewayResult["bindingMethod"];
  };
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface ReferenceGatewayEvidenceIntegrity {
  readonly algorithm: "SHA-256";
  readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
  readonly payloadSha256: string;
}

export interface ReferenceGatewayEvidenceChain {
  readonly payload: ReferenceGatewayEvidencePayload;
  readonly integrity: ReferenceGatewayEvidenceIntegrity;
}

function canonicalizeValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical evidence JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeValue).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported canonical evidence value type: ${typeof value}.`);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function canonicalizeReferenceGatewayEvidence(payload: ReferenceGatewayEvidencePayload): string {
  return canonicalizeValue(payload);
}

export function computeReferenceGatewayEvidenceSha256(payload: ReferenceGatewayEvidencePayload): string {
  return createHash("sha256").update(canonicalizeReferenceGatewayEvidence(payload), "utf8").digest("hex");
}

export function createReferenceGatewayEvidenceChain(result: ReferenceGatewayResult): ReferenceGatewayEvidenceChain {
  const steps: ReferenceGatewayEvidenceStep[] = [
    {
      sequence: 1,
      kind: "REQUEST_ACCEPTED",
      evidence: { kind: result.request.kind, identityRule: result.request.identityRule },
    },
    {
      sequence: 2,
      kind: "REQUEST_NORMALIZED",
      evidence: { request: result.request },
    },
  ];

  if (result.conversionEvidence) {
    steps.push({
      sequence: steps.length + 1,
      kind: "COLORSPACE_TRANSFORMED",
      evidence: result.conversionEvidence,
    });
  }

  steps.push({
    sequence: steps.length + 1,
    kind: "MASTER_CANDIDATES_RANKED",
    evidence: { candidates: result.candidates },
  });
  steps.push({
    sequence: steps.length + 1,
    kind: "REFERENCE_OUTCOME_RECORDED",
    evidence: {
      status: result.status,
      boundReference: result.boundReference,
      bindingMethod: result.bindingMethod,
    },
  });
  steps.push({
    sequence: steps.length + 1,
    kind: "CLAIM_BOUNDARY_RECORDED",
    evidence: { claimBoundary: result.claimBoundary, limitations: result.limitations },
  });

  const payload: ReferenceGatewayEvidencePayload = {
    schemaVersion: "ARBE_REFERENCE_GATEWAY_EVIDENCE_V1",
    requestKind: result.request.kind,
    steps,
    outcome: {
      status: result.status,
      boundReference: result.boundReference,
      bindingMethod: result.bindingMethod,
    },
    claimBoundary: result.claimBoundary,
    limitations: result.limitations,
  };

  const chain: ReferenceGatewayEvidenceChain = {
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeReferenceGatewayEvidenceSha256(payload),
    },
  };
  return deepFreeze(chain);
}

export function verifyReferenceGatewayEvidenceChain(chain: ReferenceGatewayEvidenceChain): boolean {
  if (
    chain.payload.schemaVersion !== "ARBE_REFERENCE_GATEWAY_EVIDENCE_V1" ||
    chain.integrity.algorithm !== "SHA-256" ||
    chain.integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" ||
    !/^[a-f0-9]{64}$/.test(chain.integrity.payloadSha256)
  ) return false;

  const expected = Buffer.from(computeReferenceGatewayEvidenceSha256(chain.payload), "hex");
  const supplied = Buffer.from(chain.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
