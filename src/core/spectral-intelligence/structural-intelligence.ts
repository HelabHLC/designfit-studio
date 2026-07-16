import type { MetamerismEvidence } from "../metamerism";
import type { StructuralDriftEvidence } from "../scissor";
import type { SpectralMomentDescriptor } from "./moment-descriptor";
import type { SpectralWindowStructure } from "./window-structure";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type StructuralFindingStatus =
  | "PASS"
  | "WATCH"
  | "REVIEW"
  | "BLOCK"
  | "NOT_PERFORMED";

export type StructuralFindingDomain =
  | "DELTA_LAMBDA"
  | "DISPERSION"
  | "SKEWNESS"
  | "WINDOW_STRUCTURE"
  | "METAMERISM";

export interface StructuralIntelligencePolicy {
  readonly dispersionSigmaWatchNm: number;
  readonly dispersionSigmaReviewNm: number;
  readonly dispersionSigmaBlockNm: number;
  readonly skewDeltaWatch: number;
  readonly skewDeltaReview: number;
  readonly skewDeltaBlock: number;
  readonly activeWindowShareThreshold: number;
  readonly localizedDominantShareThreshold: number;
  readonly distributedWindowCountThreshold: number;
  readonly oscillatorySignChangeThreshold: number;
}

export interface StructuralIntelligenceFinding {
  readonly sequence: number;
  readonly domain: StructuralFindingDomain;
  readonly status: StructuralFindingStatus;
  readonly evidenceStatus: string;
  readonly explanation: string;
}

export interface StructuralIntelligenceInput {
  readonly targetReference: string;
  readonly referenceMoment: SpectralMomentDescriptor;
  readonly candidateMoment: SpectralMomentDescriptor;
  readonly windowStructure: SpectralWindowStructure;
  readonly structuralDrift: StructuralDriftEvidence;
  readonly metamerism?: MetamerismEvidence;
  readonly policy: StructuralIntelligencePolicy;
}

export interface StructuralIntelligenceAssessment {
  readonly schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_V1";
  readonly targetReference: string;
  readonly method: "RULE_BASED_ATLAS_BOUND_STRUCTURAL_INTERPRETATION_V1";
  readonly overallStatus:
    | "STRUCTURAL_EVIDENCE_INCOMPLETE"
    | "STRUCTURALLY_STABLE"
    | "STRUCTURAL_WATCH"
    | "STRUCTURAL_REVIEW"
    | "STRUCTURAL_BLOCK";
  readonly deltaSigmaNm: number;
  readonly deltaMu3Standardized: number;
  readonly activeWindowCount: number;
  readonly dominantWindowId: SpectralWindowStructure["dominantWindowId"];
  readonly dominantWindowShare: number;
  readonly windowPattern: "NO_DIFFERENCE" | "LOCALIZED" | "DISTRIBUTED" | "OSCILLATORY";
  readonly findings: readonly StructuralIntelligenceFinding[];
  readonly completedDomains: number;
  readonly requiredDomains: 5;
  readonly policy: StructuralIntelligencePolicy;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function assertOrderedThresholds(watch: number, review: number, block: number, label: string): void {
  if (
    !Number.isFinite(watch) || !Number.isFinite(review) || !Number.isFinite(block) ||
    watch < 0 || review <= watch || block <= review
  ) {
    throw new Error(`${label} thresholds must be finite, non-negative and strictly ordered.`);
  }
}

function assertPolicy(policy: StructuralIntelligencePolicy): void {
  assertOrderedThresholds(
    policy.dispersionSigmaWatchNm,
    policy.dispersionSigmaReviewNm,
    policy.dispersionSigmaBlockNm,
    "Dispersion",
  );
  assertOrderedThresholds(
    policy.skewDeltaWatch,
    policy.skewDeltaReview,
    policy.skewDeltaBlock,
    "Skew",
  );
  if (
    !Number.isFinite(policy.activeWindowShareThreshold) ||
    policy.activeWindowShareThreshold < 0 ||
    policy.activeWindowShareThreshold > 1 ||
    !Number.isFinite(policy.localizedDominantShareThreshold) ||
    policy.localizedDominantShareThreshold <= 0 ||
    policy.localizedDominantShareThreshold > 1
  ) {
    throw new Error("Window share thresholds must be within 0..1.");
  }
  if (
    !Number.isInteger(policy.distributedWindowCountThreshold) ||
    policy.distributedWindowCountThreshold < 2 ||
    policy.distributedWindowCountThreshold > 6 ||
    !Number.isInteger(policy.oscillatorySignChangeThreshold) ||
    policy.oscillatorySignChangeThreshold < 1
  ) {
    throw new Error("Window count thresholds must be valid positive integers.");
  }
}

function classifyMagnitude(
  magnitude: number,
  watch: number,
  review: number,
  block: number,
): Exclude<StructuralFindingStatus, "NOT_PERFORMED"> {
  if (magnitude >= block) return "BLOCK";
  if (magnitude >= review) return "REVIEW";
  if (magnitude >= watch) return "WATCH";
  return "PASS";
}

function assertReferences(input: StructuralIntelligenceInput): void {
  if (!REFERENCE_PATTERN.test(input.targetReference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  const references = [
    input.referenceMoment.targetReference,
    input.candidateMoment.targetReference,
    input.windowStructure.targetReference,
    input.metamerism?.targetReference,
  ].filter((value): value is string => value !== undefined);
  for (const reference of references) {
    if (reference !== input.targetReference) {
      throw new Error(`Structural evidence target mismatch: expected ${input.targetReference}, received ${reference}.`);
    }
  }
}

function mapDriftStatus(status: StructuralDriftEvidence["driftStatus"]): StructuralFindingStatus {
  if (status === "STABLE") return "PASS";
  if (status === "WATCH") return "WATCH";
  if (status === "REVIEW") return "REVIEW";
  return "BLOCK";
}

function mapMetamerismStatus(evidence?: MetamerismEvidence): StructuralFindingStatus {
  if (!evidence) return "NOT_PERFORMED";
  if (evidence.status === "REFERENCE_LOCKED_METAMERISM_LOW") return "PASS";
  if (evidence.status === "REFERENCE_LOCKED_METAMERISM_WARNING") return "WATCH";
  return "BLOCK";
}

export function createStructuralIntelligenceAssessment(
  input: StructuralIntelligenceInput,
): StructuralIntelligenceAssessment {
  assertReferences(input);
  assertPolicy(input.policy);

  const deltaSigmaNm = input.candidateMoment.sigmaNm - input.referenceMoment.sigmaNm;
  const deltaMu3Standardized =
    input.candidateMoment.mu3Standardized - input.referenceMoment.mu3Standardized;
  const dominantWindow = input.windowStructure.windows.find(
    (window) => window.windowId === input.windowStructure.dominantWindowId,
  );
  if (!dominantWindow) throw new Error("Dominant spectral window is missing.");

  const activeWindowCount = input.windowStructure.windows.filter(
    (window) =>
      window.integratedAbsoluteDifferenceNm > 0 &&
      window.absoluteDifferenceShare >= input.policy.activeWindowShareThreshold,
  ).length;

  let windowPattern: StructuralIntelligenceAssessment["windowPattern"];
  let windowStatus: StructuralFindingStatus;
  if (input.windowStructure.status === "NO_DIFFERENCE") {
    windowPattern = "NO_DIFFERENCE";
    windowStatus = "PASS";
  } else if (input.windowStructure.globalSignChanges >= input.policy.oscillatorySignChangeThreshold) {
    windowPattern = "OSCILLATORY";
    windowStatus = "REVIEW";
  } else if (activeWindowCount >= input.policy.distributedWindowCountThreshold) {
    windowPattern = "DISTRIBUTED";
    windowStatus = "WATCH";
  } else {
    windowPattern = "LOCALIZED";
    windowStatus = dominantWindow.absoluteDifferenceShare >= input.policy.localizedDominantShareThreshold
      ? "PASS"
      : "WATCH";
  }

  const dispersionStatus = classifyMagnitude(
    Math.abs(deltaSigmaNm),
    input.policy.dispersionSigmaWatchNm,
    input.policy.dispersionSigmaReviewNm,
    input.policy.dispersionSigmaBlockNm,
  );
  const skewStatus = classifyMagnitude(
    Math.abs(deltaMu3Standardized),
    input.policy.skewDeltaWatch,
    input.policy.skewDeltaReview,
    input.policy.skewDeltaBlock,
  );
  const metamerismStatus = mapMetamerismStatus(input.metamerism);

  const findings: StructuralIntelligenceFinding[] = [
    {
      sequence: 1,
      domain: "DELTA_LAMBDA",
      status: mapDriftStatus(input.structuralDrift.driftStatus),
      evidenceStatus: input.structuralDrift.driftStatus,
      explanation: `Atlas-relative |ΔΔλ*| is ${Math.abs(input.structuralDrift.deltaDeltaLambdaNm)} nm.`,
    },
    {
      sequence: 2,
      domain: "DISPERSION",
      status: dispersionStatus,
      evidenceStatus: `DELTA_SIGMA_${dispersionStatus}`,
      explanation: `Candidate minus reference spectral dispersion σ is ${deltaSigmaNm} nm.`,
    },
    {
      sequence: 3,
      domain: "SKEWNESS",
      status: skewStatus,
      evidenceStatus: `DELTA_MU3_${skewStatus}`,
      explanation: `Candidate minus reference standardized μ₃ is ${deltaMu3Standardized}.`,
    },
    {
      sequence: 4,
      domain: "WINDOW_STRUCTURE",
      status: windowStatus,
      evidenceStatus: windowPattern,
      explanation: `${windowPattern} window structure with ${activeWindowCount} active windows; dominant window ${dominantWindow.windowId} carries ${dominantWindow.absoluteDifferenceShare} of assigned window difference.`,
    },
    {
      sequence: 5,
      domain: "METAMERISM",
      status: metamerismStatus,
      evidenceStatus: input.metamerism?.status ?? "NOT_PROVIDED",
      explanation: input.metamerism
        ? `Maximum supplied multi-illuminant ΔE00 is ${input.metamerism.maximumDeltaE00} under ${input.metamerism.maximumIlluminant}.`
        : "Metamerism evidence was not provided.",
    },
  ];

  const completedDomains = findings.filter((finding) => finding.status !== "NOT_PERFORMED").length;
  const statuses = findings.map((finding) => finding.status);
  const overallStatus = statuses.includes("BLOCK")
    ? "STRUCTURAL_BLOCK"
    : statuses.includes("REVIEW")
      ? "STRUCTURAL_REVIEW"
      : statuses.includes("WATCH")
        ? "STRUCTURAL_WATCH"
        : completedDomains < 5
          ? "STRUCTURAL_EVIDENCE_INCOMPLETE"
          : "STRUCTURALLY_STABLE";

  return deepFreeze({
    schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_V1",
    targetReference: input.targetReference,
    method: "RULE_BASED_ATLAS_BOUND_STRUCTURAL_INTERPRETATION_V1",
    overallStatus,
    deltaSigmaNm,
    deltaMu3Standardized,
    activeWindowCount,
    dominantWindowId: dominantWindow.windowId,
    dominantWindowShare: dominantWindow.absoluteDifferenceShare,
    windowPattern,
    findings,
    completedDomains,
    requiredDomains: 5,
    policy: { ...input.policy },
    claimBoundary: "This assessment interprets supplied atlas-bound structural evidence. It does not identify root cause, certify equivalence, approve a recipe or grant production release.",
    limitations: [
      "Assessment thresholds are explicit run parameters and are not production tolerances unless separately approved.",
      "Window patterns describe local difference topology and are not pigment classifications.",
      "Metamerism status classifies supplied upstream evidence and does not compute illuminant responses.",
      "Structural stability does not establish visual identity or spectral equivalence.",
    ],
  });
}
