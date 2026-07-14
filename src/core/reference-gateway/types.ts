import type { LabColor } from "../reference";

export interface Srgb8Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface XyzD50Color {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type ReferenceRequest =
  | { readonly kind: "REFERENCE"; readonly value: string }
  | { readonly kind: "HEX"; readonly value: string }
  | { readonly kind: "SRGB8"; readonly value: Srgb8Color }
  | { readonly kind: "XYZ_D50"; readonly value: XyzD50Color }
  | { readonly kind: "LAB"; readonly value: LabColor }
  | { readonly kind: "DESCRIPTION"; readonly value: string }
  | { readonly kind: "EXTERNAL_STANDARD"; readonly system: string; readonly value: string }
  | { readonly kind: "IMAGE"; readonly assetId: string };

export type NormalizedReferenceRequest =
  | { readonly kind: "REFERENCE"; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "HEX"; readonly value: string; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "SRGB8"; readonly value: Srgb8Color; readonly identityRule: "REQUEST_ONLY" }
  | { readonly kind: "XYZ_D50"; readonly value: XyzD50Color; readonly identityRule: "REQUEST_ONLY" }
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

export type ReferenceGatewayConversionEvidence =
  | {
      readonly sourceSpace: "SRGB_IEC61966_2_1";
      readonly destinationSpace: "CIELAB_D50";
      readonly lab: LabColor;
      readonly method: "SRGB_IEC61966_2_1_TO_LAB_D50_BRADFORD";
    }
  | {
      readonly sourceSpace: "CIE_XYZ_D50_RELATIVE_Y1";
      readonly destinationSpace: "CIELAB_D50";
      readonly lab: LabColor;
      readonly method: "CIE_XYZ_D50_RELATIVE_Y1_TO_LAB_D50";
    };

export interface ReferenceGatewayResult {
  readonly status: ReferenceGatewayStatus;
  readonly request: NormalizedReferenceRequest;
  readonly boundReference?: string;
  readonly candidates: readonly ReferenceGatewayCandidate[];
  readonly bindingMethod?:
    | "DIRECT_REFERENCE"
    | "LAB_CIE76_MASTER_SEARCH"
    | "HEX_SRGB_TO_LAB_D50_CIE76_MASTER_SEARCH"
    | "SRGB8_TO_LAB_D50_CIE76_MASTER_SEARCH"
    | "XYZ_D50_TO_LAB_D50_CIE76_MASTER_SEARCH";
  readonly conversionEvidence?: ReferenceGatewayConversionEvidence;
  readonly availableActions: readonly ("REFERENCE" | "MIXLOCK" | "PALETTE" | "PIGMENTS" | "REPORT")[];
  readonly claimBoundary: string;
  readonly limitations: readonly string[];
}
