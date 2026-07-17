import { createHash, timingSafeEqual } from "node:crypto";
import type { ExplainableRuntimeDecision } from "../runtime-intelligence";

export interface ExplainableDecisionReportBinding {
  readonly payload: {
    readonly schemaVersion: "ARBE_EXPLAINABLE_DECISION_REPORT_BINDING_V1";
    readonly reportType: "REFERENCE_BOUND_EXPLAINABLE_RUNTIME_DECISION";
    readonly targetReference: string;
    readonly decision: ExplainableRuntimeDecision["decision"];
    readonly explanation: ExplainableRuntimeDecision;
    readonly claimBoundary: string;
    readonly limitations: readonly string[];
  };
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Explainable decision report does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported explainable decision report value type: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(explanation: ExplainableRuntimeDecision): void {
  if (explanation.schemaVersion !== "ARBE_EXPLAINABLE_RUNTIME_DECISION_V1") throw new Error("Unsupported explainable runtime decision schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(explanation.targetReference)) throw new Error("Explainable decision reference must match Hxxx_Lxxx_Cxxx.");
  if (explanation.findings.length !== 4) throw new Error("Explainable decision requires four ordered runtime findings.");
  if (!explanation.prohibitedClaims.includes("RECIPE_APPROVED") || !explanation.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED")) {
    throw new Error("Explainable decision lost mandatory prohibited claims.");
  }
}

export function computeExplainableDecisionReportSha256(payload: ExplainableDecisionReportBinding["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createExplainableDecisionReportBinding(explanation: ExplainableRuntimeDecision): ExplainableDecisionReportBinding {
  validate(explanation);
  const payload: ExplainableDecisionReportBinding["payload"] = {
    schemaVersion: "ARBE_EXPLAINABLE_DECISION_REPORT_BINDING_V1",
    reportType: "REFERENCE_BOUND_EXPLAINABLE_RUNTIME_DECISION",
    targetReference: explanation.targetReference,
    decision: explanation.decision,
    explanation,
    claimBoundary: "This report binds a deterministic runtime explanation only. It does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
    limitations: [...explanation.limitations, "Report integrity proves explanation payload consistency, not upstream scientific validity."],
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeExplainableDecisionReportSha256(payload),
    },
  });
}

export function verifyExplainableDecisionReportBinding(report: ExplainableDecisionReportBinding): boolean {
  const { payload, integrity } = report;
  if (payload.schemaVersion !== "ARBE_EXPLAINABLE_DECISION_REPORT_BINDING_V1" || payload.reportType !== "REFERENCE_BOUND_EXPLAINABLE_RUNTIME_DECISION") return false;
  if (payload.targetReference !== payload.explanation.targetReference || payload.decision !== payload.explanation.decision) return false;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  try { validate(payload.explanation); } catch { return false; }
  const expected = Buffer.from(computeExplainableDecisionReportSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
