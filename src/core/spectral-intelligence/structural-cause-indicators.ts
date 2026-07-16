import type { StructuralDriftEvidence } from "../scissor";
import type {
  StructuralFindingDomain,
  StructuralFindingStatus,
  StructuralIntelligenceAssessment,
} from "./structural-intelligence";
import type {
  SpectralWindowDirection,
  SpectralWindowId,
  SpectralWindowStructure,
} from "./window-structure";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type StructuralCauseIndicatorCode =
  | "NO_STRUCTURAL_CAUSE_INDICATOR"
  | "SHORTWAVE_BALANCE_SHIFT"
  | "LONGWAVE_BALANCE_SHIFT"
  | "SPECTRAL_BROADENING"
  | "SPECTRAL_NARROWING"
  | "SHORTWAVE_ASYMMETRIC_MIGRATION"
  | "LONGWAVE_ASYMMETRIC_MIGRATION"
  | "LOCALIZED_REFLECTANCE_ELEVATION"
  | "LOCALIZED_REFLECTANCE_DEPRESSION"
  | "LOCALIZED_MIXED_STRUCTURE"
  | "BROADBAND_REFLECTANCE_SHIFT"
  | "OSCILLATORY_SPECTRAL_STRUCTURE"
  | "MULTI_ILLUMINANT_INSTABILITY";

export type InvestigationDomain =
  | "PIGMENT_OR_FORMULATION"
  | "SUBSTRATE_OR_COATING"
  | "PROCESS_CONDITION"
  | "MEASUREMENT_SYSTEM"
  | "ILLUMINANT_METAMERISM";

export interface StructuralCauseIndicator {
  readonly sequence: number;
  readonly code: StructuralCauseIndicatorCode;
  readonly sourceDomain: StructuralFindingDomain | "COMBINED";
  readonly sourceStatus: StructuralFindingStatus;
  readonly dominantWindowId?: SpectralWindowId;
  readonly direction?: SpectralWindowDirection | "SHORTWAVE" | "LONGWAVE" | "BROADENING" | "NARROWING";
  readonly evidence: string;
  readonly interpretation: string;
}

export interface StructuralInvestigationCandidate {
  readonly sequence: number;
  readonly domain: InvestigationDomain;
  readonly triggeredBy: readonly StructuralCauseIndicatorCode[];
  readonly action: string;
  readonly boundary: "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE";
}

export interface StructuralCauseIndicatorsResult {
  readonly schemaVersion: "ARBE_STRUCTURAL_CAUSE_INDICATORS_V1";
  readonly targetReference: string;
  readonly method: "DETERMINISTIC_EVIDENCE_TO_INVESTIGATION_INDICATORS_V1";
  readonly assessmentStatus: StructuralIntelligenceAssessment["overallStatus"];
  readonly indicators: readonly StructuralCauseIndicator[];
  readonly investigationCandidates: readonly StructuralInvestigationCandidate[];
  readonly status: "NO_INDICATOR" | "INDICATORS_RECORDED" | "EVIDENCE_INCOMPLETE";
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface StructuralCauseIndicatorsInput {
  readonly assessment: StructuralIntelligenceAssessment;
  readonly windowStructure: SpectralWindowStructure;
  readonly structuralDrift: StructuralDriftEvidence;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function finding(
  assessment: StructuralIntelligenceAssessment,
  domain: StructuralFindingDomain,
) {
  const value = assessment.findings.find((item) => item.domain === domain);
  if (!value) throw new Error(`Structural cause indicators require ${domain} evidence.`);
  return value;
}

function assertInput(input: StructuralCauseIndicatorsInput): void {
  const reference = input.assessment.targetReference;
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new Error("Target reference must match Hxxx_Lxxx_Cxxx.");
  }
  if (input.windowStructure.targetReference !== reference) {
    throw new Error("Structural cause indicator window target mismatch.");
  }
}

function candidateRules(indicators: readonly StructuralCauseIndicator[]): StructuralInvestigationCandidate[] {
  const codes = new Set(indicators.map((indicator) => indicator.code));
  const candidates: Array<Omit<StructuralInvestigationCandidate, "sequence">> = [];

  const add = (domain: InvestigationDomain, triggers: StructuralCauseIndicatorCode[], action: string) => {
    const triggeredBy = triggers.filter((trigger) => codes.has(trigger));
    if (triggeredBy.length === 0) return;
    candidates.push({
      domain,
      triggeredBy,
      action,
      boundary: "INVESTIGATION_CANDIDATE_NOT_ROOT_CAUSE",
    });
  };

  add(
    "PIGMENT_OR_FORMULATION",
    [
      "SHORTWAVE_BALANCE_SHIFT",
      "LONGWAVE_BALANCE_SHIFT",
      "SHORTWAVE_ASYMMETRIC_MIGRATION",
      "LONGWAVE_ASYMMETRIC_MIGRATION",
      "LOCALIZED_REFLECTANCE_ELEVATION",
      "LOCALIZED_REFLECTANCE_DEPRESSION",
      "LOCALIZED_MIXED_STRUCTURE",
    ],
    "Compare documented formulation, pigment-lot and drawdown evidence against the locked reference.",
  );
  add(
    "SUBSTRATE_OR_COATING",
    ["SPECTRAL_BROADENING", "SPECTRAL_NARROWING", "BROADBAND_REFLECTANCE_SHIFT"],
    "Compare unprinted or uncoated substrate and coating measurements under the same geometry.",
  );
  add(
    "PROCESS_CONDITION",
    [
      "SPECTRAL_BROADENING",
      "SPECTRAL_NARROWING",
      "BROADBAND_REFLECTANCE_SHIFT",
      "OSCILLATORY_SPECTRAL_STRUCTURE",
    ],
    "Review process settings, layer thickness, curing, trapping and batch records before assigning cause.",
  );
  add(
    "MEASUREMENT_SYSTEM",
    ["OSCILLATORY_SPECTRAL_STRUCTURE", "LOCALIZED_MIXED_STRUCTURE"],
    "Repeat measurement with instrument verification, stable positioning and documented geometry.",
  );
  add(
    "ILLUMINANT_METAMERISM",
    ["MULTI_ILLUMINANT_INSTABILITY"],
    "Review the supplied illuminant-dependent evidence and repeat under the defined viewing conditions.",
  );

  return candidates.map((candidate, index) => ({ sequence: index + 1, ...candidate }));
}

export function createStructuralCauseIndicators(
  input: StructuralCauseIndicatorsInput,
): StructuralCauseIndicatorsResult {
  assertInput(input);

  const indicators: StructuralCauseIndicator[] = [];
  const add = (indicator: Omit<StructuralCauseIndicator, "sequence">) => {
    indicators.push({ sequence: indicators.length + 1, ...indicator });
  };

  const deltaLambda = finding(input.assessment, "DELTA_LAMBDA");
  if (deltaLambda.status !== "PASS" && deltaLambda.status !== "NOT_PERFORMED") {
    const longwave = input.structuralDrift.deltaDeltaLambdaNm > 0;
    add({
      code: longwave ? "LONGWAVE_BALANCE_SHIFT" : "SHORTWAVE_BALANCE_SHIFT",
      sourceDomain: "DELTA_LAMBDA",
      sourceStatus: deltaLambda.status,
      direction: longwave ? "LONGWAVE" : "SHORTWAVE",
      evidence: deltaLambda.explanation,
      interpretation: `The atlas-relative balance displacement is directed toward the ${longwave ? "longwave" : "shortwave"} side.`,
    });
  }

  const dispersion = finding(input.assessment, "DISPERSION");
  if (dispersion.status !== "PASS" && dispersion.status !== "NOT_PERFORMED") {
    const broadening = input.assessment.deltaSigmaNm > 0;
    add({
      code: broadening ? "SPECTRAL_BROADENING" : "SPECTRAL_NARROWING",
      sourceDomain: "DISPERSION",
      sourceStatus: dispersion.status,
      direction: broadening ? "BROADENING" : "NARROWING",
      evidence: dispersion.explanation,
      interpretation: `The candidate reflectance distribution is ${broadening ? "broader" : "narrower"} than the atlas-bound reference distribution.`,
    });
  }

  const skewness = finding(input.assessment, "SKEWNESS");
  if (skewness.status !== "PASS" && skewness.status !== "NOT_PERFORMED") {
    const longwave = input.assessment.deltaMu3Standardized > 0;
    add({
      code: longwave ? "LONGWAVE_ASYMMETRIC_MIGRATION" : "SHORTWAVE_ASYMMETRIC_MIGRATION",
      sourceDomain: "SKEWNESS",
      sourceStatus: skewness.status,
      direction: longwave ? "LONGWAVE" : "SHORTWAVE",
      evidence: skewness.explanation,
      interpretation: `The standardized spectral asymmetry changed toward the ${longwave ? "longwave" : "shortwave"} side.`,
    });
  }

  const windows = finding(input.assessment, "WINDOW_STRUCTURE");
  const dominant = input.windowStructure.windows.find(
    (window) => window.windowId === input.windowStructure.dominantWindowId,
  );
  if (!dominant) throw new Error("Dominant window evidence is missing.");

  if (input.assessment.windowPattern === "LOCALIZED") {
    const code = dominant.direction === "CANDIDATE_ABOVE"
      ? "LOCALIZED_REFLECTANCE_ELEVATION"
      : dominant.direction === "CANDIDATE_BELOW"
        ? "LOCALIZED_REFLECTANCE_DEPRESSION"
        : "LOCALIZED_MIXED_STRUCTURE";
    add({
      code,
      sourceDomain: "WINDOW_STRUCTURE",
      sourceStatus: windows.status,
      dominantWindowId: dominant.windowId,
      direction: dominant.direction,
      evidence: windows.explanation,
      interpretation: `The principal recorded difference is localized in ${dominant.windowId} with direction ${dominant.direction}.`,
    });
  } else if (input.assessment.windowPattern === "DISTRIBUTED") {
    add({
      code: "BROADBAND_REFLECTANCE_SHIFT",
      sourceDomain: "WINDOW_STRUCTURE",
      sourceStatus: windows.status,
      dominantWindowId: dominant.windowId,
      direction: dominant.direction,
      evidence: windows.explanation,
      interpretation: "Recorded reflectance difference is distributed across multiple analytical windows.",
    });
  } else if (input.assessment.windowPattern === "OSCILLATORY") {
    add({
      code: "OSCILLATORY_SPECTRAL_STRUCTURE",
      sourceDomain: "WINDOW_STRUCTURE",
      sourceStatus: windows.status,
      dominantWindowId: dominant.windowId,
      direction: dominant.direction,
      evidence: windows.explanation,
      interpretation: "Repeated sign changes create an oscillatory difference topology requiring controlled investigation.",
    });
  }

  const metamerism = finding(input.assessment, "METAMERISM");
  if (metamerism.status === "WATCH" || metamerism.status === "REVIEW" || metamerism.status === "BLOCK") {
    add({
      code: "MULTI_ILLUMINANT_INSTABILITY",
      sourceDomain: "METAMERISM",
      sourceStatus: metamerism.status,
      evidence: metamerism.explanation,
      interpretation: "Supplied multi-illuminant evidence indicates viewing-condition sensitivity.",
    });
  }

  if (indicators.length === 0 && input.assessment.overallStatus === "STRUCTURALLY_STABLE") {
    add({
      code: "NO_STRUCTURAL_CAUSE_INDICATOR",
      sourceDomain: "COMBINED",
      sourceStatus: "PASS",
      evidence: "All completed Structural Intelligence domains are PASS under the applied policy.",
      interpretation: "No structural cause indicator is raised by the supplied evidence.",
    });
  }

  const investigationCandidates = candidateRules(indicators);
  const status = input.assessment.overallStatus === "STRUCTURAL_EVIDENCE_INCOMPLETE"
    ? "EVIDENCE_INCOMPLETE"
    : indicators.some((indicator) => indicator.code !== "NO_STRUCTURAL_CAUSE_INDICATOR")
      ? "INDICATORS_RECORDED"
      : "NO_INDICATOR";

  return deepFreeze({
    schemaVersion: "ARBE_STRUCTURAL_CAUSE_INDICATORS_V1",
    targetReference: input.assessment.targetReference,
    method: "DETERMINISTIC_EVIDENCE_TO_INVESTIGATION_INDICATORS_V1",
    assessmentStatus: input.assessment.overallStatus,
    indicators,
    investigationCandidates,
    status,
    claimBoundary: "These are structural indicators and investigation candidates, not root-cause findings. They do not identify a pigment, substrate, coating, process fault or measurement fault and do not grant production release.",
    limitations: [
      "Candidate domains identify where controlled investigation may be useful; they are not probability rankings.",
      "A single spectral pattern can be compatible with multiple physical causes.",
      "Cause confirmation requires controlled comparison data, documented materials and process evidence.",
      "No visual identity, spectral equivalence, recipe approval, certification or production release is established.",
    ],
  });
}
