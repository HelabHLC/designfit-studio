# Reference Gateway LCh(ab) D50 binding

This increment adds deterministic routing for cylindrical CIELAB D50 requests.

## Input contract

```text
L*: 0 to 100 inclusive
C*: nonnegative
h°: 0 inclusive to 360 exclusive
```

Hue is interpreted in degrees using the standard CIELAB axes:

```text
a* = C* cos(h°)
b* = C* sin(h°)
```

Therefore 0° lies on the positive a* axis and 90° lies on the positive b* axis.

## Runtime flow

```text
LCh(ab) D50 request
→ Cartesian CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

The original LCh values remain `REQUEST_ONLY`. Only the bound `Hxxx_Lxxx_Cxxx` record is an ARBE identity.

## Claim boundary

LCh values do not prove measurement geometry, observer, illuminant, instrument calibration, substrate, provenance or spectral reflectance. This adapter performs deterministic communication-space routing. It does not establish spectral AtlasFit validation, visual equivalence, certification or production approval.
