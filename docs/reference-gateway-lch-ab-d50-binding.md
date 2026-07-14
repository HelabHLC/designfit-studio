# Reference Gateway HLC D50 binding

This increment adds deterministic routing for cylindrical CIELAB D50 requests using ARBE-preferred HLC ordering.

## Input contract

```text
H: 0° inclusive to 360° exclusive
L: 0 to 100 inclusive
C: nonnegative
```

The request object is ordered as:

```text
{ h, l, c }
```

Hue is interpreted in degrees using the standard CIELAB axes:

```text
a* = C* cos(H°)
b* = C* sin(H°)
```

Therefore 0° lies on the positive a* axis and 90° lies on the positive b* axis.

## Runtime flow

```text
HLC D50 request
→ Cartesian CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

The original HLC values remain `REQUEST_ONLY`. Only the bound `Hxxx_Lxxx_Cxxx` record is an ARBE identity.

## Claim boundary

HLC values do not prove measurement geometry, observer, illuminant, instrument calibration, substrate, provenance or spectral reflectance. This adapter performs deterministic communication-space routing. It does not establish spectral AtlasFit validation, visual equivalence, certification or production approval.
