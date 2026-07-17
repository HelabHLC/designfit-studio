import { createHash } from "node:crypto";

import type { IndustrialDecisionGraph } from "./decision-graph";
import type { IndustrialDecisionContract } from "./industrial-decision-contract";
import type { IndustrialDecisionEngineResult } from "./industrial-decision-engine";

export type DecisionLedgerArtifactType = "DECISION_CONTRACT" | "ENGINE_RESULT" | "DECISION_GRAPH";

export interface DecisionLedgerEntry {
  readonly sequence: number;
  readonly artifactType: DecisionLedgerArtifactType;
  readonly schemaVersion: string;
  readonly artifactSha256: string;
  readonly previousEntrySha256: string | null;
  readonly entrySha256: string;
  readonly claimBoundary: string;
}

export interface IndustrialDecisionLedger {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_LEDGER_V1";
  readonly targetReference: string;
  readonly entries: readonly DecisionLedgerEntry[];
  readonly headEntrySha256: string;
  readonly ledgerSha256: string;
  readonly integrity: "VERIFIED";
  readonly prohibitedClaims: IndustrialDecisionContract["prohibitedClaims"];
  readonly claimBoundary: string;
}

const SHA256 = /^[a-f0-9]{64}$/;

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

function createEntry(
  sequence: number,
  artifactType: DecisionLedgerArtifactType,
  schemaVersion: string,
  artifactSha256: string,
  previousEntrySha256: string | null,
  claimBoundary: string,
): DecisionLedgerEntry {
  if (!SHA256.test(artifactSha256)) throw new Error(`${artifactType} artifact hash must be lowercase SHA-256.`);
  const payload = { sequence, artifactType, schemaVersion, artifactSha256, previousEntrySha256, claimBoundary };
  return { ...payload, entrySha256: sha256(payload) };
}

function contractSha256(contract: IndustrialDecisionContract): string {
  return sha256(contract);
}

export function verifyIndustrialDecisionLedger(ledger: IndustrialDecisionLedger): boolean {
  if (ledger.schemaVersion !== "ARBE_INDUSTRIAL_DECISION_LEDGER_V1" || ledger.entries.length === 0) return false;

  let previous: string | null = null;
  for (let index = 0; index < ledger.entries.length; index += 1) {
    const entry = ledger.entries[index];
    if (entry.sequence !== index || entry.previousEntrySha256 !== previous) return false;
    const payload = {
      sequence: entry.sequence,
      artifactType: entry.artifactType,
      schemaVersion: entry.schemaVersion,
      artifactSha256: entry.artifactSha256,
      previousEntrySha256: entry.previousEntrySha256,
      claimBoundary: entry.claimBoundary,
    };
    if (sha256(payload) !== entry.entrySha256) return false;
    previous = entry.entrySha256;
  }

  if (ledger.headEntrySha256 !== previous) return false;
  const ledgerPayload = {
    schemaVersion: ledger.schemaVersion,
    targetReference: ledger.targetReference,
    entries: ledger.entries,
    headEntrySha256: ledger.headEntrySha256,
    prohibitedClaims: ledger.prohibitedClaims,
  };
  return sha256(ledgerPayload) === ledger.ledgerSha256;
}

export function createIndustrialDecisionLedger(
  contract: IndustrialDecisionContract,
  result: IndustrialDecisionEngineResult,
  graph: IndustrialDecisionGraph,
): IndustrialDecisionLedger {
  if (contract.targetReference !== result.targetReference || contract.targetReference !== graph.targetReference) {
    throw new Error("Decision ledger artifacts must bind the same ARBE reference.");
  }
  if (graph.rootNodeId !== `decision:${result.decisionSha256}`) {
    throw new Error("Decision graph root must bind the supplied engine result.");
  }

  const contractEntry = createEntry(
    0,
    "DECISION_CONTRACT",
    contract.schemaVersion,
    contractSha256(contract),
    null,
    contract.claimBoundary,
  );
  const resultEntry = createEntry(
    1,
    "ENGINE_RESULT",
    result.schemaVersion,
    result.decisionSha256,
    contractEntry.entrySha256,
    result.claimBoundary,
  );
  const graphEntry = createEntry(
    2,
    "DECISION_GRAPH",
    graph.schemaVersion,
    graph.graphSha256,
    resultEntry.entrySha256,
    graph.claimBoundary,
  );
  const entries = [contractEntry, resultEntry, graphEntry] as const;
  const ledgerPayload = {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_LEDGER_V1" as const,
    targetReference: contract.targetReference,
    entries,
    headEntrySha256: graphEntry.entrySha256,
    prohibitedClaims: contract.prohibitedClaims,
  };
  const ledger: IndustrialDecisionLedger = {
    ...ledgerPayload,
    ledgerSha256: sha256(ledgerPayload),
    integrity: "VERIFIED",
    claimBoundary:
      "This ledger records immutable hash bindings between decision artifacts. It does not confirm equivalence or root cause, approve a recipe, or grant production release.",
  };

  if (!verifyIndustrialDecisionLedger(ledger)) throw new Error("Industrial decision ledger integrity verification failed.");
  return freeze(ledger);
}
