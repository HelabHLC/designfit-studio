import { createHash } from "node:crypto";

import type { IndustrialDecisionContract, IndustrialDecisionModule } from "./industrial-decision-contract";
import type { IndustrialDecisionEngineResult } from "./industrial-decision-engine";

export type DecisionGraphNodeType = "EVIDENCE" | "MODULE_FINDING" | "DECISION_CONTRACT" | "ENGINE_RESULT";
export type DecisionGraphEdgeType = "SUPPORTS" | "NORMALIZES_INTO" | "SYNTHESIZES_INTO";

export interface DecisionGraphNode {
  readonly id: string;
  readonly type: DecisionGraphNodeType;
  readonly label: string;
  readonly sha256: string;
}

export interface DecisionGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly type: DecisionGraphEdgeType;
}

export interface IndustrialDecisionGraph {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_GRAPH_V1";
  readonly targetReference: string;
  readonly rootNodeId: string;
  readonly nodes: readonly DecisionGraphNode[];
  readonly edges: readonly DecisionGraphEdge[];
  readonly topologicalOrder: readonly string[];
  readonly graphSha256: string;
  readonly claimBoundary: string;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function moduleNodeId(module: IndustrialDecisionModule): string {
  return `finding:${module}`;
}

export function createIndustrialDecisionGraph(
  contract: IndustrialDecisionContract,
  result: IndustrialDecisionEngineResult,
): IndustrialDecisionGraph {
  if (contract.schemaVersion !== "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1") {
    throw new Error("Decision Graph v1 requires Industrial Decision Contract v1.");
  }
  if (result.schemaVersion !== "ARBE_INDUSTRIAL_DECISION_ENGINE_RESULT_V1") {
    throw new Error("Decision Graph v1 requires Industrial Decision Engine Result v1.");
  }
  if (contract.targetReference !== result.targetReference) {
    throw new Error("Decision contract and engine result must bind the same ARBE reference.");
  }

  const resultBindings = new Map(result.evidenceBindings.map((binding) => [binding.module, binding.evidenceSha256]));
  for (const binding of contract.evidenceBindings) {
    if (resultBindings.get(binding.module) !== binding.evidenceSha256) {
      throw new Error(`Engine result evidence binding mismatch for ${binding.module}.`);
    }
  }

  const nodes: DecisionGraphNode[] = [];
  const edges: DecisionGraphEdge[] = [];
  const order: string[] = [];

  for (const finding of contract.findings) {
    const evidenceId = `evidence:${finding.module}:${finding.evidenceSha256}`;
    const findingId = moduleNodeId(finding.module);
    nodes.push({ id: evidenceId, type: "EVIDENCE", label: `${finding.module} evidence`, sha256: finding.evidenceSha256 });
    nodes.push({ id: findingId, type: "MODULE_FINDING", label: `${finding.module}:${finding.status}`, sha256: sha256(finding) });
    edges.push({ from: evidenceId, to: findingId, type: "SUPPORTS" });
    order.push(evidenceId, findingId);
  }

  const contractId = "contract:industrial-decision-v1";
  const resultId = `decision:${result.decisionSha256}`;
  nodes.push({ id: contractId, type: "DECISION_CONTRACT", label: contract.readiness, sha256: sha256(contract) });
  nodes.push({ id: resultId, type: "ENGINE_RESULT", label: result.outcome, sha256: result.decisionSha256 });

  for (const finding of contract.findings) {
    edges.push({ from: moduleNodeId(finding.module), to: contractId, type: "NORMALIZES_INTO" });
  }
  edges.push({ from: contractId, to: resultId, type: "SYNTHESIZES_INTO" });
  order.push(contractId, resultId);

  const graphPayload = {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_GRAPH_V1" as const,
    targetReference: contract.targetReference,
    rootNodeId: resultId,
    nodes,
    edges,
    topologicalOrder: order,
  };

  return freeze({
    ...graphPayload,
    graphSha256: sha256(graphPayload),
    claimBoundary:
      "This graph records evidence and decision dependencies only. It does not confirm equivalence or root cause, approve a recipe, or grant production release.",
  });
}
