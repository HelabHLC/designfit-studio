import { createHash, timingSafeEqual } from "node:crypto";
import {
  verifyRuntimeIntelligenceReportBinding,
  type RuntimeIntelligenceReportBinding,
} from "./runtime-intelligence-report-binding";

export interface RuntimeEvidenceArtifact {
  readonly stageId: "REFERENCE_GATEWAY" | "SPECTRAL_INTELLIGENCE" | "RECIPE_INTELLIGENCE";
  readonly evidenceId: string;
}

export interface RuntimeIntelligenceEvidencePackage {
  readonly payload: {
    readonly schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_EVIDENCE_PACKAGE_V1";
    readonly targetReference: string;
    readonly runtimeStatus: RuntimeIntelligenceReportBinding["payload"]["runtimeStatus"];
    readonly runtimeReportSha256: string;
    readonly runtimeReport: RuntimeIntelligenceReportBinding;
    readonly evidenceArtifacts: readonly RuntimeEvidenceArtifact[];
    readonly boundary: string;
  };
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly payloadSha256: string;
  };
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (["string", "boolean"].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Runtime package JSON rejects non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported runtime package value: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function expectedArtifacts(report: RuntimeIntelligenceReportBinding): RuntimeEvidenceArtifact[] {
  return report.payload.runtimeResult.stages
    .filter((stage) => stage.status === "COMPLETED" && stage.stageId !== "RUNTIME_REPORT_BINDING")
    .map((stage) => {
      if (!stage.evidenceId?.trim()) throw new Error(`Completed stage ${stage.stageId} requires an evidenceId.`);
      return { stageId: stage.stageId as RuntimeEvidenceArtifact["stageId"], evidenceId: stage.evidenceId };
    });
}

function validate(report: RuntimeIntelligenceReportBinding, artifacts: readonly RuntimeEvidenceArtifact[]): RuntimeEvidenceArtifact[] {
  if (!verifyRuntimeIntelligenceReportBinding(report)) throw new Error("Runtime report integrity failed.");
  const expected = expectedArtifacts(report);
  if (artifacts.length !== expected.length) throw new Error("Runtime package requires exact completed-stage evidence coverage.");
  const supplied = new Map(artifacts.map((item) => [`${item.stageId}:${item.evidenceId}`, item]));
  if (supplied.size !== artifacts.length) throw new Error("Runtime evidence artifacts must be unique.");
  for (const item of expected) {
    if (!supplied.has(`${item.stageId}:${item.evidenceId}`)) throw new Error(`Missing runtime evidence artifact for ${item.stageId}.`);
  }
  return expected;
}

export function computeRuntimeIntelligenceEvidencePackageSha256(payload: RuntimeIntelligenceEvidencePackage["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createRuntimeIntelligenceEvidencePackage(
  runtimeReport: RuntimeIntelligenceReportBinding,
  evidenceArtifacts: readonly RuntimeEvidenceArtifact[],
): RuntimeIntelligenceEvidencePackage {
  const ordered = validate(runtimeReport, evidenceArtifacts);
  const payload: RuntimeIntelligenceEvidencePackage["payload"] = {
    schemaVersion: "ARBE_RUNTIME_INTELLIGENCE_EVIDENCE_PACKAGE_V1",
    targetReference: runtimeReport.payload.targetReference,
    runtimeStatus: runtimeReport.payload.runtimeStatus,
    runtimeReportSha256: runtimeReport.integrity.payloadSha256,
    runtimeReport,
    evidenceArtifacts: ordered,
    boundary: "This package transports verified runtime evidence references. It does not certify equivalence, confirm root cause, approve a recipe or grant production release.",
  };
  return freeze({ payload, integrity: { algorithm: "SHA-256", canonicalization: "ARBE_CANONICAL_JSON_V1", payloadSha256: computeRuntimeIntelligenceEvidencePackageSha256(payload) } });
}

export function verifyRuntimeIntelligenceEvidencePackage(value: RuntimeIntelligenceEvidencePackage): boolean {
  const { payload, integrity } = value;
  if (payload.schemaVersion !== "ARBE_RUNTIME_INTELLIGENCE_EVIDENCE_PACKAGE_V1") return false;
  if (payload.targetReference !== payload.runtimeReport.payload.targetReference || payload.runtimeStatus !== payload.runtimeReport.payload.runtimeStatus) return false;
  if (payload.runtimeReportSha256 !== payload.runtimeReport.integrity.payloadSha256) return false;
  try { validate(payload.runtimeReport, payload.evidenceArtifacts); } catch { return false; }
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  const expected = Buffer.from(computeRuntimeIntelligenceEvidencePackageSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
