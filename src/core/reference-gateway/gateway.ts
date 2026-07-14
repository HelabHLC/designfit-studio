import { findMasterCandidates } from "../master";
import type { MasterRepository } from "../master";
import { normalizeReferenceRequest } from "./normalize";
import { convertHexToLabD50 } from "./srgb-lab";
import type { ReferenceGatewayResult, ReferenceRequest } from "./types";

const CLAIM_BOUNDARY =
  "This result is the deterministic ARBE λ* binding of the submitted request. The submitted request itself is not an ARBE reference identity.";

const ACTIONS = ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"] as const;

async function bindLab(
  repository: MasterRepository,
  request: ReferenceGatewayResult["request"],
  lab: { readonly l: number; readonly a: number; readonly b: number },
  bindingMethod:
    | "LAB_CIE76_MASTER_SEARCH"
    | "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH",
  conversionEvidence?: ReferenceGatewayResult["conversionEvidence"],
): Promise<ReferenceGatewayResult> {
  const candidates = await findMasterCandidates(repository, lab, { limit: 5 });
  const nearest = candidates[0];
  if (!nearest) {
    return {
      status: "REFERENCE_NOT_FOUND",
      request,
      candidates: [],
      conversionEvidence,
      availableActions: ["REFERENCE"],
      claimBoundary: CLAIM_BOUNDARY,
      limitations: ["The active Master Runtime contains no searchable references."],
    };
  }

  const sourceLimitation = request.kind === "HEX"
    ? "HEX is interpreted as an encoded sRGB communication request and converted to CIELAB D50 before candidate routing."
    : "Lab is a communication request, not an ARBE identity.";

  return {
    status: "REFERENCE_BOUND",
    request,
    boundReference: nearest.reference,
    candidates: candidates.map((candidate) => ({
      rank: candidate.rank,
      reference: candidate.reference,
      distance: candidate.distance,
      method: candidate.method,
    })),
    bindingMethod,
    conversionEvidence,
    availableActions: ACTIONS,
    claimBoundary: CLAIM_BOUNDARY,
    limitations: [
      sourceLimitation,
      "CIE76 candidate routing uses Master communication values and does not replace spectral AtlasFit validation.",
      "Display profile, device calibration, viewing conditions and source provenance are not recoverable from a bare HEX value.",
      "No Spectral Scissor, recipe solution, Metamerism Gate or production approval has been performed.",
    ],
  };
}

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
    return bindLab(repository, normalized, normalized.value, "LAB_CIE76_MASTER_SEARCH");
  }

  if (normalized.kind === "HEX") {
    const conversion = convertHexToLabD50(normalized.value);
    return bindLab(
      repository,
      normalized,
      conversion.labD50,
      "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH",
      {
        sourceSpace: "SRGB_IEC61966_2_1",
        destinationSpace: "CIELAB_D50",
        lab: conversion.labD50,
        method: conversion.method,
      },
    );
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
