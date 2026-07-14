import type { LabColor } from "../reference";

export type ReferenceRequest =
  | { readonly kind: "REFERENCE"; readonly value: string }
  | { readonly kind: "HEX"; readonly value: string }
  | { readonly kind: "LAB"; readonly value: LabColor }
  | { readonly kind: "DESCRIPTION"; readonly value: string }
  | { readonly kind: "EXTERNAL_STANDARD"; readonly system: string; readonly value: string }
  | { readonly kind: "IMAGE"; readonly assetId: string };

export type NormalizedReferenceRequest =
  | { readonly kind: "REFERENCE"; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "HEX"; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "LAB"; readonly value: LabColor; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "DESCRIPTION"; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "EXTERNAL_STANDARD"; readonly system: string; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "IMAGE"; readonly assetId: string; readonly identityRule: "REQUEST_ONLY" };

export type ReferenceGatewayStatus =
  | "REFERENCE_BOUND"
  | "REFERENCE_NOT_FOUND"
  | "REQUEST_NORMALIZED_BINDING_UNAVAILABLE";

export interface ReferenceGatewayCandidate {
  readonly rank: number;
  readonly reference: string;
  readonly distance?: number;
  readonly method: "DIRECT_REFERENCE" | "CIE76";
}

export interface ReferenceGatewayResult {
  readonly status: ReferenceGatewayStatus;
  readonly request: NormalizedReferenceRequest;
  readonly boundReference?: string;
  readonly candidates: readonly ReferenceGatewayCandidate[];
  readonly bindingMethod?: "DIRECT_REFERENCE" | "LAB_CIE76_MASTER_SEARCH";
  readonly availableActions: readonly ("REFERENCE" | "MIXLOCK" | "PALETTE" | "PIGMENTS" | "REPORT")[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}
