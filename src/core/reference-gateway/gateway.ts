import { findMasterCandidates } from "../master";
import type { MasterRepository } from "../master";
import { normalizeReferenceRequest } from "./normalize";
import type { ReferenceGatewayResult, ReferenceRequest } from "./types";

const CLAIM_BOUNDARY =
  "This result is the deterministic ARBE λ* binding of the submitted request. The submitted request itself is not an ARBE reference identity.";

const ACTIONS = ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"] as const;

export async function runReferenceGateway(
  repository: MasterRepository,
  request: ReferenceRequest,
): Promise<ReferenceGatewayResult> {
  const normalized = normalizeReferenceRequest(request);

  if (normalized.kind === "REFERENCE") {
    const record = await repository.findByReference(normalized.value);
    if (!record) {
      return {
        status: "REFERENCE_NOT_FOUND",
        request: normalized,
        candidates: [],
        availableActions: ["REFERENCE"],
        claimBoundary: CLAIM_BOUNDARY,
        limitations: ["The requested ARBE reference does not exist in the active Master Runtime."],
      };
    }
    return {
      status: "REFERENCE_BOUND",
      request: normalized,
      boundReference: record.reference,
      candidates: [{ rank: 1, reference: record.reference, method: "DIRECT_REFERENCE" }],
      bindingMethod: "DIRECT_REFERENCE",
      availableActions: ACTIONS,
      claimBoundary: CLAIM_BOUNDARY,
      limitations: ["Direct reference lookup validates existence; it does not perform MixLock or production approval."],
    };
  }

  if (normalized.kind === "LAB") {
    const candidates = await findMasterCandidates(repository, normalized.value, { limit: 5 });
    const nearest = candidates[0];
    if (!nearest) {
      return {
        status: "REFERENCE_NOT_FOUND",
        request: normalized,
        candidates: [],
        availableActions: ["REFERENCE"],
        claimBoundary: CLAIM_BOUNDARY,
        limitations: ["The active Master Runtime contains no searchable references."],
      };
    }
    return {
      status: "REFERENCE_BOUND",
      request: normalized,
      boundReference: nearest.reference,
      candidates: candidates.map((candidate) => ({
        rank: candidate.rank,
        reference: candidate.reference,
        distance: candidate.distance,
        method: candidate.method,
      })),
      bindingMethod: "LAB_CIE76_MASTER_SEARCH",
      availableActions: ACTIONS,
      claimBoundary: CLAIM_BOUNDARY,
      limitations: [
        "Lab is a communication request, not an ARBE identity.",
        "This initial Gateway binding uses CIE76 candidate routing and does not replace spectral AtlasFit validation.",
        "No Spectral Scissor, recipe solution, Metamerism Gate or production approval has been performed.",
      ],
    };
  }

  return {
    status: "REQUEST_NORMALIZED_BINDING_UNAVAILABLE",
    request: normalized,
    candidates: [],
    availableActions: ["REFERENCE"],
    claimBoundary: CLAIM_BOUNDARY,
    limitations: [
      `The ${normalized.kind} request is normalized but has no authoritative colorimetric or spectral binding adapter yet.`,
      "No reference has been guessed or invented.",
    ],
  };
}
