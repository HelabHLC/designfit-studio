import { createHash } from "node:crypto";

import type { IndustrialDecisionGraph } from "./decision-graph";
import type { IndustrialDecisionContract, IndustrialDecisionModule } from "./industrial-decision-contract";
import type { IndustrialDecisionEngineResult, IndustrialDecisionOutcome } from "./industrial-decision-engine";
import type { IndustrialDecisionLedger } from "./decision-ledger";
import { verifyIndustrialDecisionLedger } from "./decision-ledger";

export type PractitionerDecision = "CONTINUE" | "CONTINUE_WITH_CAUTION" | "DO_NOT_CONTINUE" | "MORE_EVIDENCE_REQUIRED";
export type PractitionerRisk = "LOW" | "MODERATE" | "HIGH" | "UNRESOLVED";

export interface IndustrialDecisionReport {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_REPORT_V1";
  readonly targetReference: string;
  readonly domain: IndustrialDecisionContract["domain"];
  readonly practitioner: {
    readonly decision: PractitionerDecision;
    readonly headline: string;
    readonly risk: PractitionerRisk;
    readonly reason: string;
    readonly nextAction: string;
    readonly supportingModules: readonly IndustrialDecisionModule[];
    readonly cautionModules: readonly IndustrialDecisionModule[];
    readonly blockingModules: readonly IndustrialDecisionModule[];
    readonly notRunModules: readonly IndustrialDecisionModule[];
  };
  readonly technicalEvidence: {
    readonly engineOutcome: IndustrialDecisionOutcome;
    readonly rationaleCode: IndustrialDecisionEngineResult["rationaleCode"];
    readonly decisionSha256: string;
    readonly graphSha256: string;
    readonly ledgerSha256: string;
    readonly ledgerIntegrity: "VERIFIED";
    readonly evidenceBindings: IndustrialDecisionContract["evidenceBindings"];
    readonly prohibitedClaims: IndustrialDecisionContract["prohibitedClaims"];
  };
  readonly reportSha256: string;
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

function practitionerDecision(outcome: IndustrialDecisionOutcome): PractitionerDecision {
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED") return "CONTINUE";
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION") return "CONTINUE_WITH_CAUTION";
  if (outcome === "TECHNICAL_REVIEW_BLOCKED") return "DO_NOT_CONTINUE";
  return "MORE_EVIDENCE_REQUIRED";
}

function practitionerRisk(outcome: IndustrialDecisionOutcome): PractitionerRisk {
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED") return "LOW";
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION") return "MODERATE";
  if (outcome === "TECHNICAL_REVIEW_BLOCKED") return "HIGH";
  return "UNRESOLVED";
}

function headline(outcome: IndustrialDecisionOutcome): string {
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED") return "Continue with technical review.";
  if (outcome === "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION") return "Continue with caution and resolve the listed findings.";
  if (outcome === "TECHNICAL_REVIEW_BLOCKED") return "Do not continue until blocking findings are resolved.";
  return "Collect additional evidence before continuing.";
}

function reason(result: IndustrialDecisionEngineResult): string {
  if (result.blockingModules.length > 0) return `Blocking findings are present in: ${result.blockingModules.join(", ")}.`;
  if (result.cautionModules.length > 0 || result.notRunModules.length > 0) {
    return `Caution or incomplete execution remains in: ${[...result.cautionModules, ...result.notRunModules].join(", ")}.`;
  }
  if (result.outcome === "INSUFFICIENT_DECISION_EVIDENCE") return "The submitted evidence is not ready for decision synthesis.";
  return "All submitted module findings support technical review.";
}

function nextAction(result: IndustrialDecisionEngineResult): string {
  if (result.blockingModules.length > 0) return `Resolve and rerun: ${result.blockingModules.join(", ")}.`;
  if (result.notRunModules.length > 0) return `Execute missing modules: ${result.notRunModules.join(", ")}.`;
  if (result.cautionModules.length > 0) return `Review caution findings before release-related decisions: ${result.cautionModules.join(", ")}.`;
  if (result.outcome === "INSUFFICIENT_DECISION_EVIDENCE") return "Add the missing evidence and rerun the industrial decision workflow.";
  return "Proceed to technical review; production release still requires the applicable approval process.";
}

export function createIndustrialDecisionReport(
  contract: IndustrialDecisionContract,
  result: IndustrialDecisionEngineResult,
  graph: IndustrialDecisionGraph,
  ledger: IndustrialDecisionLedger,
): IndustrialDecisionReport {
  if (![result.targetReference, graph.targetReference, ledger.targetReference].every((value) => value === contract.targetReference)) {
    throw new Error("Industrial decision report artifacts must bind the same ARBE reference.");
  }
  if (graph.rootNodeId !== `decision:${result.decisionSha256}`) throw new Error("Decision graph does not bind the engine result.");
  if (!verifyIndustrialDecisionLedger(ledger)) throw new Error("Decision ledger integrity is not verified.");
  if (ledger.entries.at(-1)?.artifactSha256 !== graph.graphSha256) throw new Error("Decision ledger does not bind the supplied graph.");

  const payload = {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_REPORT_V1" as const,
    targetReference: contract.targetReference,
    domain: contract.domain,
    practitioner: {
      decision: practitionerDecision(result.outcome),
      headline: headline(result.outcome),
      risk: practitionerRisk(result.outcome),
      reason: reason(result),
      nextAction: nextAction(result),
      supportingModules: result.supportingModules,
      cautionModules: result.cautionModules,
      blockingModules: result.blockingModules,
      notRunModules: result.notRunModules,
    },
    technicalEvidence: {
      engineOutcome: result.outcome,
      rationaleCode: result.rationaleCode,
      decisionSha256: result.decisionSha256,
      graphSha256: graph.graphSha256,
      ledgerSha256: ledger.ledgerSha256,
      ledgerIntegrity: ledger.integrity,
      evidenceBindings: result.evidenceBindings,
      prohibitedClaims: result.prohibitedClaims,
    },
  };

  return freeze({
    ...payload,
    reportSha256: sha256(payload),
    claimBoundary:
      "This report supports practitioner-facing technical review decisions. It does not confirm visual or spectral equivalence, establish physical root cause, approve a recipe, or grant production release.",
  });
}
