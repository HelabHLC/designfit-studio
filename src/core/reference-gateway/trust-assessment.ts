import {
  verifyReferenceGatewayDecisionObject,
  type ReferenceGatewayDecisionObject,
} from "./decision-object";

export type ReferenceGatewayTrustDomain =
  | "DECISION_INTEGRITY"
  | "REQUEST_IDENTITY"
  | "TRANSFORMATION_EVIDENCE"
  | "REFERENCE_BINDING"
  | "SPECTRAL_VALIDATION"
  | "PRODUCTION_AUTHORITY";

export type ReferenceGatewayTrustStatus =
  | "VERIFIED"
  | "RECORDED"
  | "NOT_REQUIRED"
  | "NOT_AVAILABLE"
  | "NOT_PERFORMED"
  | "NOT_GRANTED";

export interface ReferenceGatewayTrustFinding {
  readonly sequence: number;
  readonly domain: ReferenceGatewayTrustDomain;
  readonly status: ReferenceGatewayTrustStatus;
  readonly basis: string;
}

export interface ReferenceGatewayTrustAssessment {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_TRUST_ASSESSMENT_V1";
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly assessmentMethod: "RULE_BASED_EVIDENCE_STATUS_V1";
  readonly overallStatus: "EVIDENCE_VERIFIED_REFERENCE_BOUND" | "EVIDENCE_VERIFIED_NO_REFERENCE_BOUND";
  readonly findings: readonly ReferenceGatewayTrustFinding[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createReferenceGatewayTrustAssessment(
  decision: ReferenceGatewayDecisionObject,
): ReferenceGatewayTrustAssessment {
  if (!verifyReferenceGatewayDecisionObject(decision)) {
    throw new Error("Reference Gateway Decision Object integrity verification failed.");
  }

  const directReference = decision.gatewayResult.request.kind === "REFERENCE";
  const conversionRecorded = decision.gatewayResult.conversionEvidence !== undefined;
  const referenceBound = decision.payload.status === "REFERENCE_BOUND" && decision.payload.boundReference !== undefined;

  const findings: ReferenceGatewayTrustFinding[] = [
    {
      sequence: 1,
      domain: "DECISION_INTEGRITY",
      status: "VERIFIED",
      basis: "Decision Object and linked Evidence Chain passed deterministic SHA-256 integrity and cross-object consistency verification.",
    },
    {
      sequence: 2,
      domain: "REQUEST_IDENTITY",
      status: "RECORDED",
      basis: `The ${decision.payload.requestKind} input is recorded under the REQUEST_ONLY identity rule.`,
    },
    {
      sequence: 3,
      domain: "TRANSFORMATION_EVIDENCE",
      status: conversionRecorded ? "RECORDED" : directReference ? "NOT_REQUIRED" : "NOT_AVAILABLE",
      basis: conversionRecorded
        ? "A declared communication-space transformation to CIELAB D50 is present in the Evidence Chain."
        : directReference
          ? "Direct ARBE reference lookup does not require a communication-space transformation."
          : "No separate colourspace transformation evidence was recorded for this request path.",
    },
    {
      sequence: 4,
      domain: "REFERENCE_BINDING",
      status: referenceBound ? "VERIFIED" : "NOT_AVAILABLE",
      basis: referenceBound
        ? `The Gateway bound the request to existing ARBE reference ${decision.payload.boundReference}.`
        : `The Gateway completed with status ${decision.payload.status} and did not bind or invent an ARBE reference.`,
    },
    {
      sequence: 5,
      domain: "SPECTRAL_VALIDATION",
      status: "NOT_PERFORMED",
      basis: "Reference Gateway routing does not perform AtlasFit, Spectral Scissor, Structural Drift or Metamerism Gate validation.",
    },
    {
      sequence: 6,
      domain: "PRODUCTION_AUTHORITY",
      status: "NOT_GRANTED",
      basis: "The Gateway decision does not constitute certification, recipe approval or production release.",
    },
  ];

  return deepFreeze({
    schemaVersion: "ARBE_REFERENCE_GATEWAY_TRUST_ASSESSMENT_V1",
    decisionSha256: decision.integrity.payloadSha256,
    evidenceSha256: decision.evidenceChain.integrity.payloadSha256,
    assessmentMethod: "RULE_BASED_EVIDENCE_STATUS_V1",
    overallStatus: referenceBound
      ? "EVIDENCE_VERIFIED_REFERENCE_BOUND"
      : "EVIDENCE_VERIFIED_NO_REFERENCE_BOUND",
    findings,
    claimBoundary: decision.payload.claimBoundary,
    limitations: decision.payload.limitations,
  });
}
