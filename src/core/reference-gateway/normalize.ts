import type { NormalizedReferenceRequest, ReferenceRequest, Srgb8Color, XyzD50Color } from "./types";

const REFERENCE_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;
const HEX_PATTERN = /^#[0-9A-F]{6}$/;

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty.`);
  return normalized;
}

function normalizeSrgb8(value: Srgb8Color): Srgb8Color {
  const channels = [value.r, value.g, value.b];
  if (!channels.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255)) {
    throw new Error("sRGB8 request channels must be integers between 0 and 255.");
  }
  return { r: value.r, g: value.g, b: value.b };
}

function normalizeXyzD50(value: XyzD50Color): XyzD50Color {
  const components = [value.x, value.y, value.z];
  if (!components.every((component) => typeof component === "number" && Number.isFinite(component))) {
    throw new Error("XYZ D50 request components must be finite numbers.");
  }
  if (!components.every((component) => component >= 0)) {
    throw new Error("XYZ D50 request components must be nonnegative relative values.");
  }
  return { x: value.x, y: value.y, z: value.z };
}

export function normalizeReferenceRequest(request: ReferenceRequest): NormalizedReferenceRequest {
  if (request.kind === "REFERENCE") {
    const value = nonEmpty(request.value, "Reference").toUpperCase();
    if (!REFERENCE_PATTERN.test(value)) {
      throw new Error("Reference request must match Hxxx_Lxxx_Cxxx.");
    }
    return { kind: "REFERENCE", value, identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "HEX") {
    const value = nonEmpty(request.value, "HEX").toUpperCase();
    const normalized = value.startsWith("#") ? value : `#${value}`;
    if (!HEX_PATTERN.test(normalized)) throw new Error("HEX request must contain exactly six hexadecimal digits.");
    return { kind: "HEX", value: normalized, identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "SRGB8") {
    return { kind: "SRGB8", value: normalizeSrgb8(request.value), identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "XYZ_D50") {
    return { kind: "XYZ_D50", value: normalizeXyzD50(request.value), identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "LAB") {
    const { l, a, b } = request.value;
    if (![l, a, b].every((value) => typeof value === "number" && Number.isFinite(value))) {
      throw new Error("Lab request components must be finite numbers.");
    }
    if (l < 0 || l > 100) throw new Error("Lab L must be between 0 and 100.");
    return { kind: "LAB", value: { l, a, b }, identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "DESCRIPTION") {
    return { kind: "DESCRIPTION", value: nonEmpty(request.value, "Description"), identityRule: "REQUEST_ONLY" };
  }

  if (request.kind === "EXTERNAL_STANDARD") {
    return {
      kind: "EXTERNAL_STANDARD",
      system: nonEmpty(request.system, "External standard system").toUpperCase(),
      value: nonEmpty(request.value, "External standard value"),
      identityRule: "REQUEST_ONLY",
    };
  }

  return {
    kind: "IMAGE",
    assetId: nonEmpty(request.assetId, "Image asset ID"),
    identityRule: "REQUEST_ONLY",
  };
}
