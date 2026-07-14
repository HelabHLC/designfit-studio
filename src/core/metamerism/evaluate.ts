export type MetamerismStatus =
  | "REFERENCE_LOCKED_METAMERISM_LOW"
  | "REFERENCE_LOCKED_METAMERISM_WARNING"
  | "REFERENCE_LOCKED_METAMERISM_RISK"
  | "METAMERISM_INVALID";

export interface IlluminantDeltaEvidence {
  readonly illuminant: string;
  readonly deltaE00: number;
}

export interface MetamerismThresholds {
  readonly warningDeltaE00: number;
  readonly riskDeltaE00: number;
}

export interface MetamerismEvidence {
  readonly status: MetamerismStatus;
  readonly targetReference: string;
  readonly referenceLocked: boolean;
  readonly evaluations: readonly IlluminantDeltaEvidence[];
  readonly maximumDeltaE00: number;
  readonly maximumIlluminant: string;
  readonly thresholds: MetamerismThresholds;
  readonly method: "PRECOMPUTED_MULTI_ILLUMINANT_DELTA_E00_GATE";
  readonly verdict: "METAMERISM_QUALIFIED" | "NOT_FINAL";
  readonly limitations: readonly string[];
}

function assertThresholds(thresholds: MetamerismThresholds): void {
  if (
    !Number.isFinite(thresholds.warningDeltaE00) ||
    !Number.isFinite(thresholds.riskDeltaE00) ||
    thresholds.warningDeltaE00 < 0 ||
    thresholds.riskDeltaE00 <= thresholds.warningDeltaE00
  ) {
    throw new Error("Metamerism thresholds must be finite, non-negative and strictly ordered.");
  }
}

export function evaluateMetamerismGate(
  targetReference: string,
  referenceLocked: boolean,
  evaluations: readonly IlluminantDeltaEvidence[],
  thresholds: MetamerismThresholds,
): MetamerismEvidence {
  assertThresholds(thresholds);
  if (!/^H\d{3}_L\d{3}_C\d{3}$/.test(targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  if (evaluations.length < 2) {
    throw new Error("Metamerism evaluation requires at least two illuminants.");
  }
  const seen = new Set<string>();
  for (const evaluation of evaluations) {
    const illuminant = evaluation.illuminant.trim();
    if (!illuminant) throw new Error("Illuminant labels must not be empty.");
    if (seen.has(illuminant)) throw new Error(`Duplicate illuminant: ${illuminant}.`);
    seen.add(illuminant);
    if (!Number.isFinite(evaluation.deltaE00) || evaluation.deltaE00 < 0) {
      throw new Error(`Delta E00 for ${illuminant} must be finite and non-negative.`);
    }
  }

  const maximum = evaluations.reduce((current, evaluation) =>
    evaluation.deltaE00 > current.deltaE00 ? evaluation : current,
  );

  let status: MetamerismStatus;
  if (!referenceLocked) status = "METAMERISM_INVALID";
  else if (maximum.deltaE00 >= thresholds.riskDeltaE00) {
    status = "REFERENCE_LOCKED_METAMERISM_RISK";
  } else if (maximum.deltaE00 >= thresholds.warningDeltaE00) {
    status = "REFERENCE_LOCKED_METAMERISM_WARNING";
  } else {
    status = "REFERENCE_LOCKED_METAMERISM_LOW";
  }

  return {
    status,
    targetReference,
    referenceLocked,
    evaluations: evaluations.map((evaluation) => ({ ...evaluation })),
    maximumDeltaE00: maximum.deltaE00,
    maximumIlluminant: maximum.illuminant,
    thresholds,
    method: "PRECOMPUTED_MULTI_ILLUMINANT_DELTA_E00_GATE",
    verdict: referenceLocked ? "METAMERISM_QUALIFIED" : "NOT_FINAL",
    limitations: [
      "This gate classifies supplied multi-illuminant Delta E00 evidence; it does not compute spectral-to-Lab values.",
      "The illuminants, observer, adaptation method and colorimetric tables must be documented by the upstream calculator.",
      "Thresholds are explicit run parameters and are not production tolerances unless separately approved.",
      "Not a production approval.",
    ],
  };
}
