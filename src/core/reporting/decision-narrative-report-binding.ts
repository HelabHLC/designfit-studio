import { createHash, timingSafeEqual } from "node:crypto";
import type { DecisionNarrative } from "../runtime-intelligence";

export interface DecisionNarrativeReportBinding {
  readonly payload: {
    readonly schemaVersion: "ARBE_DECISION_NARRATIVE_REPORT_BINDING_V1";
    readonly reportType: "REFERENCE_BOUND_DECISION_NARRATIVE";
    readonly targetReference: string;
    readonly decision: DecisionNarrative["decision"];
    readonly paragraphCount: number;
    readonly narrative: DecisionNarrative;
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
    if (!Number.isFinite(value)) throw new Error("Decision narrative report does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported decision narrative report value type: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(narrative: DecisionNarrative): void {
  if (narrative.schemaVersion !== "ARBE_DECISION_NARRATIVE_V1") throw new Error("Unsupported decision narrative schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(narrative.targetReference)) throw new Error("Decision narrative reference must match Hxxx_Lxxx_Cxxx.");
  if (narrative.paragraphs.length !== 3) throw new Error("Decision narrative must contain exactly three deterministic paragraphs.");
  if (!narrative.closingBoundary.trim()) throw new Error("Decision narrative must preserve its closing claim boundary.");
  if (narrative.decision === "READY_FOR_REPORT_BINDING") {
    const text = narrative.paragraphs.join(" ");
    if (!text.includes("no recipe approval or production release is granted")) throw new Error("Ready narrative lost mandatory approval boundary.");
  } else if (!narrative.paragraphs.join(" ").includes("provide no basis for inference")) {
    throw new Error("Stopped narrative lost downstream-inference boundary.");
  }
}

export function computeDecisionNarrativeReportSha256(payload: DecisionNarrativeReportBinding["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createDecisionNarrativeReportBinding(narrative: DecisionNarrative): DecisionNarrativeReportBinding {
  validate(narrative);
  const payload: DecisionNarrativeReportBinding["payload"] = {
    schemaVersion: "ARBE_DECISION_NARRATIVE_REPORT_BINDING_V1",
    reportType: "REFERENCE_BOUND_DECISION_NARRATIVE",
    targetReference: narrative.targetReference,
    decision: narrative.decision,
    paragraphCount: narrative.paragraphs.length,
    narrative,
    claimBoundary: "This report binds an existing deterministic narrative only. It does not add scientific evidence, confirm root cause, approve a recipe or grant production release.",
    limitations: [
      "Narrative integrity proves payload consistency, not upstream measurement validity.",
      "The narrative may only restate evidence already present in the explainable runtime decision.",
    ],
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeDecisionNarrativeReportSha256(payload),
    },
  });
}

export function verifyDecisionNarrativeReportBinding(report: DecisionNarrativeReportBinding): boolean {
  const { payload, integrity } = report;
  if (payload.schemaVersion !== "ARBE_DECISION_NARRATIVE_REPORT_BINDING_V1" || payload.reportType !== "REFERENCE_BOUND_DECISION_NARRATIVE") return false;
  if (payload.targetReference !== payload.narrative.targetReference || payload.decision !== payload.narrative.decision) return false;
  if (payload.paragraphCount !== payload.narrative.paragraphs.length) return false;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  try { validate(payload.narrative); } catch { return false; }
  const expected = Buffer.from(computeDecisionNarrativeReportSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
