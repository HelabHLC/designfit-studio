export type ReportConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface MixLockReportModel {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly targetReference: string;
  readonly finalStatus:
    | "REFERENCE_LOCKED_METAMERISM_LOW"
    | "REFERENCE_LOCKED_METAMERISM_WARNING"
    | "REFERENCE_LOCKED_METAMERISM_RISK"
    | "MIXLOCK_UNLOCKED"
    | "MIXLOCK_INVALID";
  readonly finalVerdict: "FINAL_REFERENCE_LOCK" | "NOT_FINAL";
  readonly confidence: ReportConfidence;
  readonly request: {
    readonly type: string;
    readonly value: string;
    readonly identityRule: "REQUEST_ONLY";
  };
  readonly reference: {
    readonly nearestReference: string;
    readonly targetRank: number;
    readonly spectralRmse?: number;
    readonly deltaE00?: number;
    readonly lockMargin?: number;
  };
  readonly recipe1: readonly { readonly pigmentId: string; readonly weight: number }[];
  readonly scissor: {
    readonly crossingsBefore: number;
    readonly crossingsAfter: number;
    readonly lambdaV2Nm: number;
    readonly lambdaEeNm: number;
    readonly deltaLambdaNm: number;
    readonly masterDeltaLambdaNm: number;
    readonly deltaDeltaLambdaNm: number;
    readonly driftStatus: "STABLE" | "WATCH" | "REVIEW" | "BLOCK";
  };
  readonly recipe2: readonly { readonly pigmentId: string; readonly weight: number }[];
  readonly metamerism: {
    readonly classification: "LOW" | "WARNING" | "RISK" | "INVALID";
    readonly maximumDeltaE00: number;
    readonly maximumIlluminant: string;
    readonly evaluations: readonly {
      readonly illuminant: string;
      readonly deltaE00: number;
    }[];
  };
  readonly audit: {
    readonly runtimeVersion: string;
    readonly runtimeCommit: string;
    readonly datasetId: string;
    readonly datasetSha256: string;
    readonly lambdaV2Method: "Brent";
  };
  readonly limitations: readonly string[];
}

export function deriveReportConfidence(model: Pick<MixLockReportModel, "finalVerdict" | "finalStatus" | "scissor" | "reference">): ReportConfidence {
  if (model.finalVerdict !== "FINAL_REFERENCE_LOCK") return "LOW";
  if (model.reference.targetRank !== 1 || model.scissor.crossingsAfter !== 0) return "LOW";
  if (model.finalStatus === "REFERENCE_LOCKED_METAMERISM_LOW" && model.scissor.driftStatus === "STABLE") return "HIGH";
  return "MEDIUM";
}
