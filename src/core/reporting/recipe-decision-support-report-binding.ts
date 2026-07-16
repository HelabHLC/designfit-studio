import { createHash, timingSafeEqual } from "node:crypto";
import type { RecipeDecisionSupportResult } from "../mixlock";

export interface RecipeDecisionSupportReportBinding {
  readonly payload: {
    readonly schemaVersion: "ARBE_RECIPE_DECISION_SUPPORT_REPORT_BINDING_V1";
    readonly targetReference: string;
    readonly portfolioStatus: RecipeDecisionSupportResult["portfolioStatus"];
    readonly primaryCandidateId: string;
    readonly candidateCount: number;
    readonly decisionSupport: RecipeDecisionSupportResult;
    readonly boundary: string;
  };
  readonly integrity: { readonly algorithm: "SHA-256"; readonly payloadSha256: string };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(result: RecipeDecisionSupportResult): void {
  if (result.schemaVersion !== "ARBE_RECIPE_DECISION_SUPPORT_V1") throw new Error("Unsupported decision support schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(result.targetReference)) throw new Error("Reference must match Hxxx_Lxxx_Cxxx.");
  if (result.items.length < 2) throw new Error("At least two candidates are required.");
  const ids = new Set<string>();
  result.items.forEach((item, index) => {
    if (item.rank !== index + 1) throw new Error("Ranks must be contiguous.");
    if (ids.has(item.candidateId)) throw new Error("Candidate IDs must be unique.");
    ids.add(item.candidateId);
  });
  if (result.primaryCandidateId !== result.items[0].candidateId) throw new Error("Primary candidate must be first in review order.");
}

export function computeRecipeDecisionSupportReportSha256(payload: RecipeDecisionSupportReportBinding["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRecipeDecisionSupportReportBinding(result: RecipeDecisionSupportResult): RecipeDecisionSupportReportBinding {
  validate(result);
  const payload = {
    schemaVersion: "ARBE_RECIPE_DECISION_SUPPORT_REPORT_BINDING_V1" as const,
    targetReference: result.targetReference,
    portfolioStatus: result.portfolioStatus,
    primaryCandidateId: result.primaryCandidateId,
    candidateCount: result.items.length,
    decisionSupport: result,
    boundary: "This report records review guidance and does not grant recipe or production approval.",
  };
  return freeze({ payload, integrity: { algorithm: "SHA-256" as const, payloadSha256: computeRecipeDecisionSupportReportSha256(payload) } });
}

export function verifyRecipeDecisionSupportReportBinding(report: RecipeDecisionSupportReportBinding): boolean {
  if (report.payload.candidateCount !== report.payload.decisionSupport.items.length) return false;
  try { validate(report.payload.decisionSupport); } catch { return false; }
  const expected = Buffer.from(computeRecipeDecisionSupportReportSha256(report.payload), "hex");
  const supplied = Buffer.from(report.integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
