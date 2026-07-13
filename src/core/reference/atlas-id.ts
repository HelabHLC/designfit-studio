const ATLAS_ID_PATTERN = /^H\d{3}_L\d{3}_C\d{3}$/;

export function isAtlasId(value: string): boolean {
  return ATLAS_ID_PATTERN.test(value);
}

export function assertAtlasId(value: string): void {
  if (!isAtlasId(value)) {
    throw new Error(
      `Invalid ARBE atlas reference: "${value}". Expected Hxxx_Lxxx_Cxxx.`,
    );
  }
}
