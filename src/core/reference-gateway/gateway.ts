import { findMasterCandidates } from "../master";
import type { MasterRepository } from "../master";
import { convertHlcD50ToLabD50 } from "./lch-lab";
import { normalizeReferenceRequest } from "./normalize";
import { convertHexToLabD50, convertSrgb8ToLabD50 } from "./srgb-lab";
import type { ReferenceGatewayResult, ReferenceRequest } from "./types";
import { convertXyzD50ToLabD50 } from "./xyz-lab";

const CLAIM_BOUNDARY =
  "This result is the deterministic ARBE λ* binding of the submitted request. The submitted request itself is not an ARBE reference identity.";

const ACTIONS = ["REFERENCE", "MIXLOCK", "PALETTE", "PIGMENTS", "REPORT"] as const;

type LabBindingMethod =
  | "LAB_CIE76_MASTER_SEARCH"
  | "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH"
  | "SRGB8_TO_LAB_D50_CIE76_MASTER_SEARCH"
  | "XYZ_D50_TO_LAB_D50_CIE76_MASTER_SEARCH"
  | "HLC_D50_TO_LAB_D50_CIE76_MASTER_SEARCH";

function sourceLimitations(request: ReferenceGatewayResult["request"]): readonly [string, string] {
  if (request.kind === "HEX") {
    return [
      "HEX is interpreted as an encoded sRGB communication request and converted to CIELAB D50 before candidate routing.",
      "Display profile, device calibration, viewing conditions and source provenance are not recoverable from unprofiled sRGB channel data.",
    ];
  }
  if (request.kind === "SRGB8") {
    return [
      "SRGB8 is interpreted as encoded IEC 61966-2-1 channel data and converted to CIELAB D50 before candidate routing.",
      "Display profile, device calibration, viewing conditions and source provenance are not recoverable from unprofiled sRGB channel data.",
    ];
  }
  if (request.kind === "XYZ_D50") {
    return [
      "XYZ_D50 is interpreted as relative CIE XYZ D50 data on a Y=1 white scale and converted to CIELAB D50 before candidate routing.",
      "XYZ source measurement geometry, observer, illuminant provenance and scaling history are supplied assumptions, not inferred evidence.",
    ];
  }
  if (request.kind === "HLC_D50") {
    return [
      "HLC_D50 is interpreted as cylindrical CIELAB D50 data ordered as hue, lightness and chroma, then converted to Cartesian CIELAB D50 before candidate routing.",
      "HLC source measurement conditions, observer, illuminant and provenance are supplied assumptions, not inferred evidence.",
    ];
  }
  return [
    "Lab is a communication request, not an ARBE identity.",
    "Lab source measurement conditions and provenance are not inferred by the Gateway.",
  ];
}

async function bindLab(
  repository: MasterRepository,
  request: ReferenceGatewayResult["request"],
  lab: { readonly l: number; readonly a: number; readonly b: number },
  bindingMethod: LabBindingMethod,
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

  const [sourceLimitation, sourceContextLimitation] = sourceLimitations(request);
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
      sourceContextLimitation,
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
    return bindLab(repository, normalized, conversion.labD50, "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH", {
      sourceSpace: "SRGB_IEC61966_2_1",
      destinationSpace: "CIELAB_D50",
      lab: conversion.labD50,
      method: conversion.method,
    });
  }

  if (normalized.kind === "SRGB8") {
    const conversion = convertSrgb8ToLabD50([normalized.value.r, normalized.value.g, normalized.value.b]);
    return bindLab(repository, normalized, conversion.labD50, "SRGB8_TO_LAB_D50_CIE76_MASTER_SEARCH", {
      sourceSpace: "SRGB_IEC61966_2_1",
      destinationSpace: "CIELAB_D50",
      lab: conversion.labD50,
      method: conversion.method,
    });
  }

  if (normalized.kind === "XYZ_D50") {
    const conversion = convertXyzD50ToLabD50(normalized.value);
    return bindLab(repository, normalized, conversion.labD50, "XYZ_D50_TO_LAB_D50_CIE76_MASTER_SEARCH", {
      sourceSpace: "CIE_XYZ_D50_RELATIVE_Y1",
      destinationSpace: "CIELAB_D50",
      lab: conversion.labD50,
      method: conversion.method,
    });
  }

  if (normalized.kind === "HLC_D50") {
    const conversion = convertHlcD50ToLabD50(normalized.value);
    return bindLab(repository, normalized, conversion.labD50, "HLC_D50_TO_LAB_D50_CIE76_MASTER_SEARCH", {
      sourceSpace: "HLC_AB_D50_DEGREES",
      destinationSpace: "CIELAB_D50",
      lab: conversion.labD50,
      method: conversion.method,
    });
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
