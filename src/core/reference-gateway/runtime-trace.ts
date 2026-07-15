import type {
  ReferenceGatewayEvidenceChain,
  ReferenceGatewayEvidenceStep,
  ReferenceGatewayEvidenceStepKind,
} from "./evidence-chain";

export type ReferenceGatewayTraceStage =
  | "REQUEST"
  | "NORMALIZATION"
  | "TRANSFORMATION"
  | "SEARCH"
  | "OUTCOME"
  | "GOVERNANCE";

export interface ReferenceGatewayTraceEntry {
  readonly sequence: number;
  readonly stage: ReferenceGatewayTraceStage;
  readonly event: ReferenceGatewayEvidenceStepKind;
  readonly status: "RECORDED";
  readonly summary: string;
}

export interface ReferenceGatewayRuntimeTrace {
  readonly schemaVersion: "ARBE_REFERENCE_GATEWAY_RUNTIME_TRACE_V1";
  readonly sourceEvidenceSchema: "ARBE_REFERENCE_GATEWAY_EVIDENCE_V1";
  readonly sourceEvidenceSha256: string;
  readonly entries: readonly ReferenceGatewayTraceEntry[];
  readonly terminalStatus: ReferenceGatewayEvidenceChain["payload"]["outcome"]["status"];
  readonly boundReference?: string;
}

const TRACE_MAP: Record<
  ReferenceGatewayEvidenceStepKind,
  { readonly stage: ReferenceGatewayTraceStage; readonly summary: (step: ReferenceGatewayEvidenceStep) => string }
> = {
  REQUEST_ACCEPTED: {
    stage: "REQUEST",
    summary: () => "Reference request accepted under the REQUEST_ONLY identity rule.",
  },
  REQUEST_NORMALIZED: {
    stage: "NORMALIZATION",
    summary: () => "Reference request normalized according to its declared communication-space contract.",
  },
  COLORSPACE_TRANSFORMED: {
    stage: "TRANSFORMATION",
    summary: () => "Communication-space values transformed to the Gateway comparison space with conversion evidence.",
  },
  MASTER_CANDIDATES_RANKED: {
    stage: "SEARCH",
    summary: () => "Master candidates ranked using the recorded Gateway search method.",
  },
  REFERENCE_OUTCOME_RECORDED: {
    stage: "OUTCOME",
    summary: () => "Reference binding outcome and method recorded.",
  },
  CLAIM_BOUNDARY_RECORDED: {
    stage: "GOVERNANCE",
    summary: () => "Claim boundary and known limitations recorded.",
  },
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export function createReferenceGatewayRuntimeTrace(
  chain: ReferenceGatewayEvidenceChain,
): ReferenceGatewayRuntimeTrace {
  const entries = chain.payload.steps.map((step): ReferenceGatewayTraceEntry => {
    const descriptor = TRACE_MAP[step.kind];
    return {
      sequence: step.sequence,
      stage: descriptor.stage,
      event: step.kind,
      status: "RECORDED",
      summary: descriptor.summary(step),
    };
  });

  return deepFreeze({
    schemaVersion: "ARBE_REFERENCE_GATEWAY_RUNTIME_TRACE_V1",
    sourceEvidenceSchema: chain.payload.schemaVersion,
    sourceEvidenceSha256: chain.integrity.payloadSha256,
    entries,
    terminalStatus: chain.payload.outcome.status,
    boundReference: chain.payload.outcome.boundReference,
  });
}
