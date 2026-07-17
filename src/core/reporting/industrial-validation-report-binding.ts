import { createHash, timingSafeEqual } from "node:crypto";
import type { IndustrialValidationAssessment } from "../industrial-validation";

export interface IndustrialValidationReportBinding {
  readonly payload: {
    readonly schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_REPORT_BINDING_V1";
    readonly reportType: "REFERENCE_BOUND_INDUSTRIAL_VALIDATION_ASSESSMENT";
    readonly targetReference: string;
    readonly domain: IndustrialValidationAssessment["domain"];
    readonly decision: IndustrialValidationAssessment["decision"];
    readonly assessment: IndustrialValidationAssessment;
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
    if (!Number.isFinite(value)) throw new Error("Industrial validation report does not allow non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  throw new Error(`Unsupported industrial validation report value type: ${typeof value}.`);
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}

function validate(assessment: IndustrialValidationAssessment): void {
  if (assessment.schemaVersion !== "ARBE_INDUSTRIAL_VALIDATION_ASSESSMENT_V1") throw new Error("Unsupported industrial validation assessment schema.");
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(assessment.targetReference)) throw new Error("Industrial validation reference must match Hxxx_Lxxx_Cxxx.");
  const mandatory = [
    "VISUAL_EQUALITY_CONFIRMED",
    "SPECTRAL_EQUIVALENCE_CONFIRMED",
    "ROOT_CAUSE_CONFIRMED",
    "RECIPE_APPROVED",
    "PRODUCTION_RELEASE_GRANTED",
  ] as const;
  if (mandatory.some((claim) => !assessment.prohibitedClaims.includes(claim))) throw new Error("Industrial validation assessment lost mandatory prohibited claims.");
}

export function computeIndustrialValidationReportSha256(payload: IndustrialValidationReportBinding["payload"]): string {
  return createHash("sha256").update(canonical(payload), "utf8").digest("hex");
}

export function createIndustrialValidationReportBinding(assessment: IndustrialValidationAssessment): IndustrialValidationReportBinding {
  validate(assessment);
  const payload: IndustrialValidationReportBinding["payload"] = {
    schemaVersion: "ARBE_INDUSTRIAL_VALIDATION_REPORT_BINDING_V1",
    reportType: "REFERENCE_BOUND_INDUSTRIAL_VALIDATION_ASSESSMENT",
    targetReference: assessment.targetReference,
    domain: assessment.domain,
    decision: assessment.decision,
    assessment,
    claimBoundary: "This report binds an industrial validation assessment only. It does not certify visual equality, spectral equivalence, root cause, recipe approval or production release.",
    limitations: [
      "Report integrity proves deterministic payload consistency, not upstream scientific validity.",
      "READY_FOR_TECHNICAL_REVIEW is not a production or recipe approval.",
    ],
  };
  return freeze({
    payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      payloadSha256: computeIndustrialValidationReportSha256(payload),
    },
  });
}

export function verifyIndustrialValidationReportBinding(report: IndustrialValidationReportBinding): boolean {
  const { payload, integrity } = report;
  if (payload.schemaVersion !== "ARBE_INDUSTRIAL_VALIDATION_REPORT_BINDING_V1" || payload.reportType !== "REFERENCE_BOUND_INDUSTRIAL_VALIDATION_ASSESSMENT") return false;
  if (payload.targetReference !== payload.assessment.targetReference || payload.domain !== payload.assessment.domain || payload.decision !== payload.assessment.decision) return false;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1" || !/^[a-f0-9]{64}$/.test(integrity.payloadSha256)) return false;
  try { validate(payload.assessment); } catch { return false; }
  const expected = Buffer.from(computeIndustrialValidationReportSha256(payload), "hex");
  const supplied = Buffer.from(integrity.payloadSha256, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
