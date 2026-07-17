import { createHash } from "node:crypto";

import type {
  IndustrialDecisionContract,
  IndustrialDecisionModule,
  IndustrialModuleFindingStatus,
} from "./industrial-decision-contract";

export type IndustrialDecisionOutcome =
  | "TECHNICAL_REVIEW_SUPPORTED"
  | "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION"
  | "TECHNICAL_REVIEW_BLOCKED"
  | "INSUFFICIENT_DECISION_EVIDENCE";

export interface IndustrialDecisionEngineResult {
  readonly schemaVersion: "ARBE_INDUSTRIAL_DECISION_ENGINE_RESULT_V1";
  readonly targetReference: string;
  readonly domain: IndustrialDecisionContract["domain"];
  readonly outcome: IndustrialDecisionOutcome;
  readonly rationaleCode:
    | "ALL_SUBMITTED_MODULES_SUPPORT_REVIEW"
    | "CAUTION_OR_UNEXECUTED_MODULES_PRESENT"
    | "BLOCKING_MODULE_FINDINGS_PRESENT"
    | "CONTRACT_NOT_READY_FOR_SYNTHESIS";
  readonly supportingModules: readonly IndustrialDecisionModule[];
  readonly cautionModules: readonly IndustrialDecisionModule[];
  readonly blockingModules: readonly IndustrialDecisionModule[];
  readonly notRunModules: readonly IndustrialDecisionModule[];
  readonly statusCounts: Readonly<Record<IndustrialModuleFindingStatus, number>>;
  readonly evidenceBindings: IndustrialDecisionContract["evidenceBindings"];
  readonly decisionSha256: string;
  readonly prohibitedClaims: IndustrialDecisionContract["prohibitedClaims"];
  readonly claimBoundary: string;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function runIndustrialDecisionEngine(
  contract: IndustrialDecisionContract,
): IndustrialDecisionEngineResult {
  if (contract.schemaVersion !== "ARBE_INDUSTRIAL_DECISION_CONTRACT_V1") {
    throw new Error("Industrial Decision Engine v1 requires Industrial Decision Contract v1.");
  }

  const supportingModules = contract.findings
    .filter((finding) => finding.status === "SUPPORTS_REVIEW")
    .map((finding) => finding.module);
  const cautionModules = contract.findings
    .filter((finding) => finding.status === "CAUTION")
    .map((finding) => finding.module);
  const blockingModules = contract.findings
    .filter((finding) => finding.status === "BLOCKS_REVIEW")
    .map((finding) => finding.module);
  const notRunModules = contract.findings
    .filter((finding) => finding.status === "NOT_RUN")
    .map((finding) => finding.module);

  const statusCounts: Record<IndustrialModuleFindingStatus, number> = {
    SUPPORTS_REVIEW: supportingModules.length,
    CAUTION: cautionModules.length,
    BLOCKS_REVIEW: blockingModules.length,
    NOT_RUN: notRunModules.length,
  };

  let outcome: IndustrialDecisionOutcome;
  let rationaleCode: IndustrialDecisionEngineResult["rationaleCode"];

  if (blockingModules.length > 0) {
    outcome = "TECHNICAL_REVIEW_BLOCKED";
    rationaleCode = "BLOCKING_MODULE_FINDINGS_PRESENT";
  } else if (contract.readiness !== "READY_FOR_DECISION_SYNTHESIS") {
    outcome = "INSUFFICIENT_DECISION_EVIDENCE";
    rationaleCode = "CONTRACT_NOT_READY_FOR_SYNTHESIS";
  } else if (cautionModules.length > 0 || notRunModules.length > 0) {
    outcome = "TECHNICAL_REVIEW_SUPPORTED_WITH_CAUTION";
    rationaleCode = "CAUTION_OR_UNEXECUTED_MODULES_PRESENT";
  } else {
    outcome = "TECHNICAL_REVIEW_SUPPORTED";
    rationaleCode = "ALL_SUBMITTED_MODULES_SUPPORT_REVIEW";
  }

  const decisionPayload = {
    schemaVersion: "ARBE_INDUSTRIAL_DECISION_ENGINE_RESULT_V1" as const,
    targetReference: contract.targetReference,
    domain: contract.domain,
    outcome,
    rationaleCode,
    supportingModules,
    cautionModules,
    blockingModules,
    notRunModules,
    statusCounts,
    evidenceBindings: contract.evidenceBindings,
    prohibitedClaims: contract.prohibitedClaims,
  };
  const decisionSha256 = createHash("sha256").update(canonicalize(decisionPayload)).digest("hex");

  return freeze({
    ...decisionPayload,
    decisionSha256,
    claimBoundary:
      "This engine synthesizes submitted evidence-bearing module statuses for technical review support only. It does not confirm visual or spectral equivalence, establish physical root cause, approve a recipe, or grant production release.",
  });
}
