# Reference Gateway SRGB8 binding

This Work Package 02 increment adds deterministic routing for explicit encoded sRGB channel requests.

## Request shape

```text
{ kind: "SRGB8", value: { r: 0..255, g: 0..255, b: 0..255 } }
```

All channels must be integers in the inclusive range 0–255.

## Runtime flow

```text
encoded sRGB8 channels
→ sRGB IEC 61966-2-1 transfer-function decoding
→ XYZ D65
→ Bradford-adapted XYZ D50
→ CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

HEX and SRGB8 share one conversion implementation. The input representation remains `REQUEST_ONLY`; only the bound `Hxxx_Lxxx_Cxxx` record is an ARBE identity.

## Claim boundary

Unprofiled sRGB channel values do not provide display calibration, device profile, substrate, measurement geometry, spectral reflectance or viewing-condition evidence. The result is deterministic communication-space routing, not visual equivalence, spectral AtlasFit validation, certification or production approval.
