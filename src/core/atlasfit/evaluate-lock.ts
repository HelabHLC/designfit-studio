import type {
  AtlasFitAuditRun,
  AtlasFitFinalVerdict,
  MetamerismStatus,
  ScissorEvidence,
} from "./types";

function isSha256(value: string | undefined): boolean {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function isScissorLocked(scissor: ScissorEvidence | undefined): boolean {
  if (!scissor || scissor.status !== "SCISSOR_LOCKED") return false;
  if (scissor.crossingsAfter !== 0) return false;
  if (!scissor.nearestAfterCorrection) return false;
  if (scissor.deltaDeltaLambdaNm === undefined) return false;
  if (scissor.allowedLambdaDriftNm === undefined) return false;
  return Math.abs(scissor.deltaDeltaLambdaNm) <= scissor.allowedLambdaDriftNm;
}

function verdictFromMetamerism(status: MetamerismStatus): AtlasFitFinalVerdict {
  switch (status) {
    case "METAMERISM_LOW":
      return "REFERENCE_LOCKED_METAMERISM_LOW";
    case "METAMERISM_WARNING":
      return "REFERENCE_LOCKED_METAMERISM_WARNING";
    case "METAMERISM_RISK":
      return "REFERENCE_LOCKED_METAMERISM_RISK";
    case "METAMERISM_NOT_RUN":
      return "NOT_FINAL_MISSING_EVIDENCE";
  }
}

export function evaluateAtlasFitRun(
  run: Omit<AtlasFitAuditRun, "finalVerdict" | "missingEvidence">,
): AtlasFitAuditRun {
  const missing: string[] = [];

  if (!run.boundReference) missing.push("boundReference");
  if (!isSha256(run.boundReference?.masterDatasetSha256)) {
    missing.push("boundReference.masterDatasetSha256");
  }
  if (!run.initialRecipeCandidate) missing.push("initialRecipeCandidate");
  if (!run.initialCurveEvidence) missing.push("initialCurveEvidence");
  if (!run.scissor) missing.push("scissor");
  if (!run.scissoredTargetLab) missing.push("scissoredTargetLab");
  if (!run.refinedRecipeCandidate) missing.push("refinedRecipeCandidate");
  if (!run.finalCurveEvidence) missing.push("finalCurveEvidence");
  if (!run.metamerism) missing.push("metamerism");

  const target = run.boundReference?.targetReference;
  const scissorLocked =
    isScissorLocked(run.scissor) &&
    run.scissor?.nearestAfterCorrection === target;

  const referenceLocked =
    run.finalCurveEvidence?.nearestReference === target &&
    run.finalCurveEvidence?.targetRank === 1;

  let finalVerdict: AtlasFitFinalVerdict;
  if (missing.length > 0) {
    finalVerdict = "NOT_FINAL_MISSING_EVIDENCE";
  } else if (!scissorLocked || !referenceLocked) {
    finalVerdict = "REFERENCE_UNLOCKED";
  } else {
    finalVerdict = verdictFromMetamerism(run.metamerism!.status);
  }

  return { ...run, finalVerdict, missingEvidence: missing };
}
