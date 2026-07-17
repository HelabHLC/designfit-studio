import type { ExplainableRuntimeDecision } from "./explainable-decision-engine";

export interface DecisionNarrative {
  readonly schemaVersion: "ARBE_DECISION_NARRATIVE_V1";
  readonly targetReference: string;
  readonly decision: ExplainableRuntimeDecision["decision"];
  readonly paragraphs: readonly string[];
  readonly closingBoundary: string;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

export function createDecisionNarrative(explanation: ExplainableRuntimeDecision): DecisionNarrative {
  const blocking = explanation.findings.find((finding) => finding.severity === "BLOCKING");
  const cautionCount = explanation.findings.filter((finding) => finding.severity === "CAUTION").length;
  const evidenceCount = explanation.findings.filter((finding) => finding.evidenceId).length;

  const paragraphs = explanation.decision === "READY_FOR_REPORT_BINDING"
    ? [
        `${explanation.targetReference} remained bound to the recorded ARBE runtime sequence. All required stages completed with documented evidence.`,
        cautionCount > 0
          ? `${cautionCount} conditional stage was explicitly skipped with evidence; this does not block integrity-bound reporting.`
          : "All requested decision stages completed without a documented conditional skip.",
        `${evidenceCount} stage evidence reference${evidenceCount === 1 ? " was" : "s were"} preserved. The result may proceed to technical review, but no recipe approval or production release is granted.`,
      ]
    : [
        `${explanation.targetReference} did not complete the required runtime sequence.`,
        blocking
          ? `${blocking.title} blocked further processing because ${blocking.explanation}`
          : "A required stage blocked further processing.",
        "Downstream stages that were not executed provide no basis for inference. The blocking evidence must be resolved before the runtime is executed again.",
      ];

  return freeze({
    schemaVersion: "ARBE_DECISION_NARRATIVE_V1",
    targetReference: explanation.targetReference,
    decision: explanation.decision,
    paragraphs,
    closingBoundary: explanation.claimBoundary,
  });
}
