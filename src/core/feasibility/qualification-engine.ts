import type {
  FeasibilityCriterion,
  FeasibilityEvidence,
  FeasibilityQualification,
  FeasibilityStatus,
} from "./qualification-contract";

export interface FeasibilityQualificationInput {
  readonly qualificationId: string;
  readonly referenceId: string;
  readonly context: FeasibilityQualification["context"];
  readonly evidence: readonly FeasibilityEvidence[];
  readonly criteria: readonly FeasibilityCriterion[];
}

function normalizeId(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
    throw new Error(`${field} must use lowercase letters, numbers, dots, underscores, or hyphens.`);
  }
  return normalized;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort((a, b) => a.localeCompare(b)));
}

function determineStatus(criteria: readonly FeasibilityCriterion[]): FeasibilityStatus {
  if (criteria.length === 0) return "NOT_EVALUATED";
  if (criteria.some((criterion) => criterion.required && criterion.result === "FAIL")) return "NOT_FEASIBLE";
  if (criteria.some((criterion) => criterion.required && criterion.result === "UNKNOWN")) return "CONDITIONAL";
  if (criteria.some((criterion) => !criterion.required && criterion.result !== "PASS")) return "CONDITIONAL";
  return "FEASIBLE";
}

function buildStatement(
  referenceId: string,
  status: FeasibilityStatus,
  context: FeasibilityQualification["context"],
): string {
  const scope = `${context.substrate}; ${context.colorantSystem}; ${context.processRoute}`;
  switch (status) {
    case "FEASIBLE":
      return `Reference ${referenceId} is qualified as feasible for ${scope} within ΔE00 ≤ ${context.toleranceDeltaE00}.`;
    case "NOT_FEASIBLE":
      return `Reference ${referenceId} is not feasible for ${scope} under the evaluated required criteria.`;
    case "CONDITIONAL":
      return `Reference ${referenceId} remains conditionally feasible for ${scope}; unresolved or optional criteria require review.`;
    case "NOT_EVALUATED":
      return `Reference ${referenceId} has not yet been evaluated for ${scope}.`;
  }
}

export function qualifyFeasibility(input: FeasibilityQualificationInput): FeasibilityQualification {
  const qualificationId = normalizeId(input.qualificationId, "qualificationId");
  const referenceId = normalizeId(input.referenceId, "referenceId");
  if (!Number.isFinite(input.context.toleranceDeltaE00) || input.context.toleranceDeltaE00 < 0) {
    throw new Error("toleranceDeltaE00 must be a finite, non-negative number.");
  }

  const evidence = [...input.evidence]
    .map((item) => Object.freeze({ ...item, evidenceId: normalizeId(item.evidenceId, "evidenceId") }))
    .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
  const evidenceIds = new Set(evidence.map((item) => item.evidenceId));
  if (evidenceIds.size !== evidence.length) throw new Error("Evidence IDs must be unique.");

  const criteria = [...input.criteria]
    .map((criterion) => {
      const criterionId = normalizeId(criterion.criterionId, "criterionId");
      const normalizedEvidenceIds = uniqueSorted(criterion.evidenceIds.map((id) => normalizeId(id, "evidenceId")));
      for (const evidenceId of normalizedEvidenceIds) {
        if (!evidenceIds.has(evidenceId)) {
          throw new Error(`Criterion ${criterionId} references unknown evidence ${evidenceId}.`);
        }
      }
      if (criterion.result !== "UNKNOWN" && normalizedEvidenceIds.length === 0) {
        throw new Error(`Criterion ${criterionId} requires evidence for a ${criterion.result} result.`);
      }
      return Object.freeze({ ...criterion, criterionId, evidenceIds: normalizedEvidenceIds });
    })
    .sort((a, b) => a.criterionId.localeCompare(b.criterionId));

  if (new Set(criteria.map((criterion) => criterion.criterionId)).size !== criteria.length) {
    throw new Error("Criterion IDs must be unique.");
  }

  const blockingCriterionIds = uniqueSorted(
    criteria.filter((criterion) => criterion.required && criterion.result === "FAIL").map((criterion) => criterion.criterionId),
  );
  const unresolvedCriterionIds = uniqueSorted(
    criteria.filter((criterion) => criterion.result === "UNKNOWN").map((criterion) => criterion.criterionId),
  );
  const status = determineStatus(criteria);

  return Object.freeze({
    qualificationId,
    referenceId,
    status,
    context: Object.freeze({
      ...input.context,
      illuminants: uniqueSorted(input.context.illuminants.map((value) => value.trim()).filter(Boolean)),
      requiredFastness: input.context.requiredFastness ? Object.freeze({ ...input.context.requiredFastness }) : undefined,
      environmentalConstraints: input.context.environmentalConstraints
        ? uniqueSorted(input.context.environmentalConstraints.map((value) => value.trim()).filter(Boolean))
        : undefined,
    }),
    evidence: Object.freeze(evidence),
    criteria: Object.freeze(criteria),
    blockingCriterionIds,
    unresolvedCriterionIds,
    statement: buildStatement(referenceId, status, input.context),
  });
}
