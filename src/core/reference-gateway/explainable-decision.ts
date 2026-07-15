import type { ReferenceGatewayDecisionObject } from "./decision-object";

export type ReferenceGatewayExplanationStage =
  | "REQUEST"
  | "NORMALIZATION"
  | "TRANSFORMATION"
  | "SEARCH"
  | "OUTCOME"
  | "GOVERNANCE";

export interface ReferenceGatewayExplanationItem {
  readonly sequence: number;
  readonly stage: ReferenceGatewayExplanationStage;
  readonly title: string;
  readonly explanation: string;
}

export interface ReferenceGatewayExplainableDecision {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_EXPLANATION_V1";
  readonly decisionSha256: string;
  readonly evidenceSha256: string;
  readonly question: "WHY_THIS_GATEWAY_DECISION";
  readonly headline: string;
  readonly items: readonly ReferenceGatewayExplanationItem[];
  readonly conclusion: string;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

const TITLES: Record<ReferenceGatewayExplanationStage, string> = {
  REQUEST: "Request accepted",
  NORMALIZATION: "Request normalized",
  TRANSFORMATION: "Communication space transformed",
  SEARCH: "Master candidates ranked",
  OUTCOME: "Reference outcome recorded",
  GOVERNANCE: "Claim boundary applied",
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createReferenceGatewayExplainableDecision(
  decision: ReferenceGatewayDecisionObject,
): ReferenceGatewayExplainableDecision {
  const items = decision.runtimeTrace.entries.map((entry) => ({
    sequence: entry.sequence,
    stage: entry.stage,
    title: TITLES[entry.stage],
    explanation: entry.summary,
  }));

  const conclusion = decision.payload.boundReference
    ? `The request was routed to existing ARBE reference ${decision.payload.boundReference} using ${decision.payload.bindingMethod ?? "the recorded Gateway method"}.`
    : `The Gateway completed with status ${decision.payload.status} and did not create or invent an ARBE reference.`;

  return deepFreeze({
    schemaVersion: "ARBE_REFERENCE_GATEWAY_EXPLANATION_V1",
    decisionSha256: decision.integrity.payloadSha256,
    evidenceSha256: decision.evidenceChain.integrity.payloadSha256,
    question: "WHY_THIS_GATEWAY_DECISION",
    headline: `Why the ${decision.payload.requestKind} request produced ${decision.payload.status}`,
    items,
    conclusion,
    claimBoundary: decision.payload.claimBoundary,
    limitations: decision.payload.limitations,
  });
}
