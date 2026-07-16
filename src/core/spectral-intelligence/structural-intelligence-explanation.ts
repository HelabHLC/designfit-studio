import { createHash, timingSafeEqual } from "node:crypto";
import type {
  StructuralFindingStatus,
  StructuralIntelligenceAssessment,
} from "./structural-intelligence";

export interface StructuralExplanationSection {
  readonly sequence: number;
  readonly domain: StructuralIntelligenceAssessment["findings"][number]["domain"];
  readonly status: StructuralFindingStatus;
  readonly evidenceStatus: string;
  readonly title: string;
  readonly explanation: string;
}

export interface StructuralIntelligenceExplanationPayload {
  readonly schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_EXPLANATION_V1";
  readonly targetReference: string;
  readonly question: "WHY_THIS_STRUCTURAL_ASSESSMENT";
  readonly overallStatus: StructuralIntelligenceAssessment["overallStatus"];
  readonly headline: string;
  readonly summary: string;
  readonly sections: readonly StructuralExplanationSection[];
  readonly completedDomains: number;
  readonly requiredDomains: 5;
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}

export interface StructuralIntelligenceExplanation
  extends StructuralIntelligenceExplanationPayload {
  readonly integrity: {
    readonly algorithm: "SHA-256";
    readonly canonicalization: "ARBE_CANONICAL_JSON_V1";
    readonly digestHex: string;
  };
}

const STATUS_ORDER: Readonly<Record<StructuralFindingStatus, number>> = Object.freeze({
  BLOCK: 0,
  REVIEW: 1,
  WATCH: 2,
  NOT_PERFORMED: 3,
  PASS: 4,
});

const TITLES = Object.freeze({
  DELTA_LAMBDA: "Atlas-relative spectral balance",
  DISPERSION: "Spectral dispersion",
  SKEWNESS: "Spectral asymmetry",
  WINDOW_STRUCTURE: "Local spectral window structure",
  METAMERISM: "Multi-illuminant evidence",
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

function digest(payload: StructuralIntelligenceExplanationPayload): string {
  return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

function headline(status: StructuralIntelligenceAssessment["overallStatus"]): string {
  if (status === "STRUCTURALLY_STABLE") return "Supplied structural evidence is stable under the applied assessment policy.";
  if (status === "STRUCTURAL_WATCH") return "Supplied structural evidence contains watch-level findings.";
  if (status === "STRUCTURAL_REVIEW") return "Supplied structural evidence requires technical review.";
  if (status === "STRUCTURAL_BLOCK") return "Supplied structural evidence contains at least one blocking finding.";
  return "The structural assessment is incomplete because required evidence is missing.";
}

function summary(assessment: StructuralIntelligenceAssessment): string {
  const counts = assessment.findings.reduce<Record<StructuralFindingStatus, number>>(
    (accumulator, finding) => {
      accumulator[finding.status] += 1;
      return accumulator;
    },
    { PASS: 0, WATCH: 0, REVIEW: 0, BLOCK: 0, NOT_PERFORMED: 0 },
  );
  return `${assessment.completedDomains} of ${assessment.requiredDomains} evidence domains were completed; ` +
    `${counts.BLOCK} block, ${counts.REVIEW} review, ${counts.WATCH} watch, ` +
    `${counts.PASS} pass and ${counts.NOT_PERFORMED} not performed.`;
}

export function createStructuralIntelligenceExplanation(
  assessment: StructuralIntelligenceAssessment,
): StructuralIntelligenceExplanation {
  if (assessment.schemaVersion !== "ARBE_STRUCTURAL_INTELLIGENCE_V1") {
    throw new Error("Structural Intelligence v1 assessment is required.");
  }

  const sections = assessment.findings
    .map((finding) => ({
      sequence: finding.sequence,
      domain: finding.domain,
      status: finding.status,
      evidenceStatus: finding.evidenceStatus,
      title: TITLES[finding.domain],
      explanation: finding.explanation,
    }))
    .sort((left, right) =>
      STATUS_ORDER[left.status] - STATUS_ORDER[right.status] || left.sequence - right.sequence,
    )
    .map((section, index) => ({ ...section, sequence: index + 1 }));

  const payload: StructuralIntelligenceExplanationPayload = {
    schemaVersion: "ARBE_STRUCTURAL_INTELLIGENCE_EXPLANATION_V1",
    targetReference: assessment.targetReference,
    question: "WHY_THIS_STRUCTURAL_ASSESSMENT",
    overallStatus: assessment.overallStatus,
    headline: headline(assessment.overallStatus),
    summary: summary(assessment),
    sections,
    completedDomains: assessment.completedDomains,
    requiredDomains: assessment.requiredDomains,
    claimBoundary: assessment.claimBoundary,
    limitations: [...assessment.limitations],
  };

  return deepFreeze({
    ...payload,
    integrity: {
      algorithm: "SHA-256",
      canonicalization: "ARBE_CANONICAL_JSON_V1",
      digestHex: digest(payload),
    },
  });
}

export function verifyStructuralIntelligenceExplanation(
  explanation: StructuralIntelligenceExplanation,
): boolean {
  const { integrity, ...payload } = explanation;
  if (integrity.algorithm !== "SHA-256" || integrity.canonicalization !== "ARBE_CANONICAL_JSON_V1") {
    return false;
  }
  const expected = Buffer.from(digest(payload), "hex");
  const received = Buffer.from(integrity.digestHex, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}
