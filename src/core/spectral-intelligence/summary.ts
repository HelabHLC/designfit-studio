import type { AtlasFitEvidence } from "../atlasfit";
import type { MetamerismEvidence } from "../metamerism";
import type { ScissorPipelineEvidence, StructuralDriftEvidence } from "../scissor";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export type SpectralIntelligenceDomain =
  | "ATLASFIT"
  | "SPECTRAL_SCISSOR"
  | "STRUCTURAL_DRIFT"
  | "METAMERISM";

export type SpectralIntelligenceFindingStatus =
  | "PASS"
  | "WARNING"
  | "BLOCK"
  | "NOT_PERFORMED";

export interface SpectralIntelligenceFinding {
  readonly sequence: number;
  readonly domain: SpectralIntelligenceDomain;
  readonly status: SpectralIntelligenceFindingStatus;
  readonly evidenceStatus: string;
  readonly explanation: string;
}

export interface SpectralIntelligenceInput {
  readonly targetReference: string;
  readonly atlasFit?: AtlasFitEvidence;
  readonly spectralScissor?: ScissorPipelineEvidence;
  readonly structuralDrift?: StructuralDriftEvidence;
  readonly metamerism?: MetamerismEvidence;
}

export interface SpectralIntelligenceSummary {
  readonly schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_SUMMARY_V1";
  readonly targetReference: string;
  readonly assessmentMethod: "RULE_BASED_SPECTRAL_EVIDENCE_SUMMARY_V1";
  readonly overallStatus:
    | "SPECTRAL_EVIDENCE_INCOMPLETE"
    | "SPECTRAL_EVIDENCE_PASS"
    | "SPECTRAL_EVIDENCE_WARNING"
    | "SPECTRAL_EVIDENCE_BLOCK";
  readonly findings: readonly SpectralIntelligenceFinding[];
  readonly completedDomains: number;
  readonly requiredDomains: 4;
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

function assertReference(reference: string, label: string): void {
  if (!REFERENCE_PATTERN.test(reference)) {
    throw new Error(`${label} must match Hxxx_Lxxx_Cxxx.`);
  }
}

function assertEvidenceReferences(input: SpectralIntelligenceInput): void {
  assertReference(input.targetReference, "Target reference");
  const references = [
    input.atlasFit?.targetReference,
    input.spectralScissor?.targetReference,
    input.metamerism?.targetReference,
  ].filter((value): value is string => value !== undefined);
  for (const reference of references) {
    if (reference !== input.targetReference) {
      throw new Error(`Spectral evidence target mismatch: expected ${input.targetReference}, received ${reference}.`);
    }
  }
}

function atlasFitFinding(evidence?: AtlasFitEvidence): SpectralIntelligenceFinding {
  if (!evidence) return {
    sequence: 1,
    domain: "ATLASFIT",
    status: "NOT_PERFORMED",
    evidenceStatus: "NOT_PROVIDED",
    explanation: "AtlasFit evidence was not provided.",
  };
  const status = evidence.status === "REFERENCE_LOCKED"
    ? "PASS"
    : evidence.status === "REFERENCE_UNLOCKED" ? "BLOCK" : "BLOCK";
  return {
    sequence: 1,
    domain: "ATLASFIT",
    status,
    evidenceStatus: evidence.status,
    explanation: evidence.status === "REFERENCE_LOCKED"
      ? `The candidate spectrum ranks ${evidence.targetReference} as the nearest master reference.`
      : evidence.status === "REFERENCE_UNLOCKED"
        ? `The candidate spectrum ranks ${evidence.nearestReference ?? "another reference"} ahead of the requested reference.`
        : "The requested master reference was not available for AtlasFit evaluation.",
  };
}

function scissorFinding(evidence?: ScissorPipelineEvidence): SpectralIntelligenceFinding {
  if (!evidence) return {
    sequence: 2,
    domain: "SPECTRAL_SCISSOR",
    status: "NOT_PERFORMED",
    evidenceStatus: "NOT_PROVIDED",
    explanation: "Spectral Scissor evidence was not provided.",
  };
  const status = evidence.status === "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR"
    ? "PASS"
    : "BLOCK";
  return {
    sequence: 2,
    domain: "SPECTRAL_SCISSOR",
    status,
    evidenceStatus: evidence.status,
    explanation: evidence.status === "SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR"
      ? "The corrected spectrum is physically valid and ready for descriptor evaluation."
      : evidence.status === "SCISSOR_CANDIDATE_OUT_OF_RANGE"
        ? "The corrected spectrum left the valid reflectance range."
        : "The requested master reference was not available for Spectral Scissor evaluation.",
  };
}

function driftFinding(evidence?: StructuralDriftEvidence): SpectralIntelligenceFinding {
  if (!evidence) return {
    sequence: 3,
    domain: "STRUCTURAL_DRIFT",
    status: "NOT_PERFORMED",
    evidenceStatus: "NOT_PROVIDED",
    explanation: "Structural Drift evidence was not provided.",
  };
  const status = evidence.driftStatus === "STABLE"
    ? "PASS"
    : evidence.driftStatus === "BLOCK" ? "BLOCK" : "WARNING";
  return {
    sequence: 3,
    domain: "STRUCTURAL_DRIFT",
    status,
    evidenceStatus: evidence.driftStatus,
    explanation: `Structural drift is ${evidence.driftStatus} with |ΔΔλ| = ${Math.abs(evidence.deltaDeltaLambdaNm)} nm.`,
  };
}

function metamerismFinding(evidence?: MetamerismEvidence): SpectralIntelligenceFinding {
  if (!evidence) return {
    sequence: 4,
    domain: "METAMERISM",
    status: "NOT_PERFORMED",
    evidenceStatus: "NOT_PROVIDED",
    explanation: "Metamerism Gate evidence was not provided.",
  };
  const status = evidence.status === "REFERENCE_LOCKED_METAMERISM_LOW"
    ? "PASS"
    : evidence.status === "REFERENCE_LOCKED_METAMERISM_WARNING" ? "WARNING" : "BLOCK";
  return {
    sequence: 4,
    domain: "METAMERISM",
    status,
    evidenceStatus: evidence.status,
    explanation: evidence.status === "METAMERISM_INVALID"
      ? "Metamerism evidence is invalid because the reference was not locked."
      : `Maximum supplied multi-illuminant ΔE00 is ${evidence.maximumDeltaE00} under ${evidence.maximumIlluminant}.`,
  };
}

export function createSpectralIntelligenceSummary(
  input: SpectralIntelligenceInput,
): SpectralIntelligenceSummary {
  assertEvidenceReferences(input);
  const findings = [
    atlasFitFinding(input.atlasFit),
    scissorFinding(input.spectralScissor),
    driftFinding(input.structuralDrift),
    metamerismFinding(input.metamerism),
  ];
  const completedDomains = findings.filter((finding) => finding.status !== "NOT_PERFORMED").length;
  const overallStatus = findings.some((finding) => finding.status === "BLOCK")
    ? "SPECTRAL_EVIDENCE_BLOCK"
    : completedDomains < 4
      ? "SPECTRAL_EVIDENCE_INCOMPLETE"
      : findings.some((finding) => finding.status === "WARNING")
        ? "SPECTRAL_EVIDENCE_WARNING"
        : "SPECTRAL_EVIDENCE_PASS";

  return deepFreeze({
    schemaVersion: "ARBE_SPECTRAL_INTELLIGENCE_SUMMARY_V1",
    targetReference: input.targetReference,
    assessmentMethod: "RULE_BASED_SPECTRAL_EVIDENCE_SUMMARY_V1",
    overallStatus,
    findings,
    completedDomains,
    requiredDomains: 4,
    claimBoundary: "This summary records supplied spectral evidence. It does not grant recipe approval, certification or production release.",
    limitations: [
      "No evidence is inferred when a module result is absent.",
      "Metamerism findings classify supplied upstream Delta E00 values and do not compute them.",
      "A spectral evidence pass is not a production approval.",
    ],
  });
}
