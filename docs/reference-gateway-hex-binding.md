# Reference Gateway HEX binding

This increment adds deterministic routing for six-digit HEX requests.

## Runtime flow

```text
#RRGGBB
→ interpret as encoded sRGB IEC 61966-2-1
→ linearize RGB
→ XYZ D65
→ Bradford-adapted XYZ D50
→ CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

The Gateway returns the converted Lab request as explicit conversion evidence. The original HEX value remains `REQUEST_ONLY` and never becomes an ARBE identity.

## Claim boundary

A bare HEX value does not contain a device profile, display calibration, measurement geometry, substrate, illuminant history or spectral curve. The resulting binding is therefore a deterministic communication-space route into the Master candidate search. It is not spectral AtlasFit validation, visual equivalence, third-party certification or production approval.

Spectral Scissor, recipe solving, reference lock and the Metamerism Gate remain downstream operations.
