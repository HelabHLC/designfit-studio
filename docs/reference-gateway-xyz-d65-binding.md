# Reference Gateway XYZ D65 binding

This increment adds deterministic routing for relative CIE XYZ D65 requests.

## Input contract

```text
X, Y, Z: finite, nonnegative relative values
white scale: Y = 1
D65 reference white: Xn = 0.95047, Yn = 1, Zn = 1.08883
```

## Runtime flow

```text
relative XYZ D65 request
→ Bradford adaptation to relative XYZ D50
→ CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

The original XYZ D65 values remain `REQUEST_ONLY`. Only the bound `Hxxx_Lxxx_Cxxx` record is an ARBE identity.

## Claim boundary

XYZ D65 values do not prove measurement geometry, observer, instrument calibration, substrate, provenance or spectral reflectance. The D65 white point and Y=1 scaling are explicit input assumptions. This adapter performs deterministic communication-space routing. It does not establish spectral AtlasFit validation, visual equivalence, certification or production approval.
