import type {
  RuntimeIntelligenceResult,
  RuntimeStageExecution,
} from "./orchestrator";

export type ExplainableDecisionSeverity = "INFORMATION" | "CAUTION" | "BLOCKING";

export interface ExplainableDecisionFinding {
  readonly sequence: number;
  readonly stageId: RuntimeStageExecution["stageId"];
  readonly status: RuntimeStageExecution["status"];
  readonly severity: ExplainableDecisionSeverity;
  readonly title: string;
  readonly explanation: string;
  readonly evidenceId?: string;
}

export interface ExplainableRuntimeDecision {
  readonly schemaVersion: "ARBE_EXPLAINABLE_RUNTIME_DECISION_V1";
  readonly targetReference: string;
  readonly question: "WHY_THIS_RUNTIME_DECISION";
  readonly decision: RuntimeIntelligenceResult["overallStatus"];
  readonly headline: string;
  readonly summary: string;
  readonly findings: readonly ExplainableDecisionFinding[];
  readonly nextAction: string;
  readonly claimBoundary: string;
  readonly prohibitedClaims: readonly string[];
  readonly limitations: readonly string[];
}

const STAGE_TITLES: Record<RuntimeStageExecution["stageId"], string> = {
  REFERENCE_GATEWAY: "Reference binding",
  SPECTRAL_INTELLIGENCE: "Spectral Intelligence",
  RECIPE_INTELLIGENCE: "Recipe Intelligence",
  RUNTIME_REPORT_BINDING: "Runtime report binding",
};

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function severity(status: RuntimeStageExecution["status"]): ExplainableDecisionSeverity {
  if (status === "STOPPED" || status === "NOT_RUN") return "BLOCKING";
  if (status === "SKIPPED_WITH_EVIDENCE") return "CAUTION";
  return "INFORMATION";
}

function explain(stage: RuntimeStageExecution): string {
  switch (stage.status) {
    case "COMPLETED":
      return `${STAGE_TITLES[stage.stageId]} completed with supplied evidence. ${stage.reason}`;
    case "READY_FOR_BINDING":
      return `${STAGE_TITLES[stage.stageId]} is ready. ${stage.reason}`;
    case "SKIPPED_WITH_EVIDENCE":
      return `${STAGE_TITLES[stage.stageId]} was not used as a completed decision stage, and the skip is explicitly documented. ${stage.reason}`;
    case "STOPPED":
      return `${STAGE_TITLES[stage.stageId]} blocked further required processing. ${stage.reason}`;
    case "NOT_RUN":
      return `${STAGE_TITLES[stage.stageId]} was not executed because an earlier required stage did not complete. ${stage.reason}`;
  }
}

export function createExplainableRuntimeDecision(
  runtime: RuntimeIntelligenceResult,
): ExplainableRuntimeDecision {
  const findings = runtime.stages.map((stage, index) => ({
    sequence: index + 1,
    stageId: stage.stageId,
    status: stage.status,
    severity: severity(stage.status),
    title: STAGE_TITLES[stage.stageId],
    explanation: explain(stage),
    evidenceId: stage.evidenceId,
  }));

  const ready = runtime.overallStatus === "READY_FOR_REPORT_BINDING";
  const headline = ready
    ? `Why ${runtime.targetReference} is ready for integrity-bound report creation`
    : `Why processing for ${runtime.targetReference} stopped at ${runtime.stoppedAt ?? "a required stage"}`;
  const summary = ready
    ? "All mandatory runtime stages completed. Optional Recipe Intelligence was either completed or skipped with explicit evidence, so the result can proceed to integrity-bound reporting."
    : `The runtime stopped because ${runtime.stoppedAt ?? "a required stage"} did not provide valid required evidence. No downstream decision may be inferred from stages that were not run.`;
  const nextAction = ready
    ? "Create the integrity-bound runtime report and preserve the complete evidence chain for technical review."
    : `Resolve the evidence issue at ${runtime.stoppedAt ?? "the blocking stage"}, then execute the runtime again from a verified input state.`;

  return freeze({
    schemaVersion: "ARBE_EXPLAINABLE_RUNTIME_DECISION_V1",
    targetReference: runtime.targetReference,
    question: "WHY_THIS_RUNTIME_DECISION",
    decision: runtime.overallStatus,
    headline,
    summary,
    findings,
    nextAction,
    claimBoundary: runtime.claimBoundary,
    prohibitedClaims: runtime.prohibitedClaims,
    limitations: runtime.limitations,
  });
}
