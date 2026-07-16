import { createHash, timingSafeEqual } from "node:crypto";
import type { RuntimeIntelligenceResult } from "../runtime-intelligence";

export interface RuntimeIntelligenceReportBinding {
  readonly payload: {
    readonly schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_REPORT_BINDING_V1";
    readonly reportType: "REFERENCE_BOUND_RUNTIME_INTELLIGENCE";
    readonly targetReference: string;
    readonly runtimeStatus: RuntimeIntelligenceResult["overallStatus"];
    readonly stoppedAt?: RuntimeIntelligenceResult["stoppedAt"];
    readonly stageCount: 4;
    readonly completedStageCount: number;
    readonly skippedStageCount: number;
    readonly runtimeResult: RuntimeIntelligenceResult;
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
    if (!Number.isFinite(value)) throw new Error("Runtime report JSON does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported runtime report value type: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(result: RuntimeIntelligenceResult): void {
  if (result.schemaVersion !== "ARBE_RUNTIME_INTELLIGENCE_RESULT_V1") throw new Error("Unsupported runtime result schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(result.targetReference)) throw new Error("Runtime report reference must match Hxxx_Lxxx_Cxxx.");
  if (result.stages.length !== 4) throw new Error("Runtime report requires exactly four stages.");
  const order = ["REFERENCE_GATEWAY", "SPECTRAL_INTELLIGENCE", "RECIPE_INTELLIGENCE", "RUNTIME_REPORT_BINDING"];
  if (!result.stages.every((stage, index) => stage.stageId === order[index])) throw new Error("Runtime stages are not in contract order.");
  if (!result.prohibitedClaims.includes("RECIPE_APPROVED") || !result.prohibitedClaims.includes("PRODUCTION_RELEASE_GRANTED")) {
    throw new Error("Runtime result lost mandatory prohibited claims.");
  }
  if (result.overallStatus === "READY_FOR_REPORT_BINDING") {
    if (result.stoppedAt !== undefined || result.stages[3].status !== "READY_FOR_BINDING") throw new Error("Ready runtime result is inconsistent.");
  } else {
    if (!result.stoppedAt || result.stages[3].status !== "NOT_RUN") throw new Error("Stopped runtime result is inconsistent.");
  }
}

export function computeRuntimeIntelligenceReportSha256(payload: RuntimeIntelligenceReportBinding["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRuntimeIntelligenceReportBinding(result: RuntimeIntelligenceResult): RuntimeIntelligenceReportBinding {
  validate(result);
  const payload: RuntimeIntelligenceReportBinding["payload"] = {
    schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_REPORT_BINDING_V1",
    reportType: "REFERENCE_BOUND_RUNTIME_INTELLIGENCE",
    targetReference: result.targetReference,
    runtimeStatus: result.overallStatus,
    stoppedAt: result.stoppedAt,
    stageCount: 4,
    completedStageCount: result.stages.filter((stage) => stage.status === "COMPLETED").length,
    skippedStageCount: result.stages.filter((stage) => stage.status === "SKIPPED_WITH_EVIDENCE").length,
    runtimeResult: result,
    claimBoundary: "This report binds supplied runtime evidence. It does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
    limitations: [...result.limitations, "Report integrity proves payload consistency, not upstream scientific validity."],
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeRuntimeIntelligenceReportSha256(payload),
    },
  });
}

export function verifyRuntimeIntelligenceReportBinding(report: RuntimeIntelligenceReportBinding): boolean {
  const { payload, integrity } = report;
  if (payload.schemaVersion !== "ARBE_RUNTIME_INTELLIGENCE_REPORT_BINDING_V1" || payload.reportType !== "REFERENCE_BOUND_RUNTIME_INTELLIGENCE") return false;
  if (payload.targetReference !== payload.runtimeResult.targetReference || payload.runtimeStatus !== payload.runtimeResult.overallStatus) return false;
  if (payload.stoppedAt !== payload.runtimeResult.stoppedAt || payload.stageCount !== payload.runtimeResult.stages.length) return false;
  if (payload.completedStageCount !== payload.runtimeResult.stages.filter((stage) => stage.status === "COMPLETED").length) return false;
  if (payload.skippedStageCount !== payload.runtimeResult.stages.filter((stage) => stage.status === "SKIPPED_WITH_EVIDENCE").length) return false;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  try { validate(payload.runtimeResult); } catch { return false; }
  const expected = Buffer.from(computeRuntimeIntelligenceReportSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
