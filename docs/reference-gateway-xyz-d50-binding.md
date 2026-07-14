# Reference Gateway XYZ D50 binding

This increment adds deterministic routing for relative CIE XYZ D50 requests.

## Input contract

```text
{ x, y, z }
```

The values are interpreted as finite, nonnegative, relative CIE XYZ tristimulus values under D50 with the reference white scaled to `Y = 1`:

```text
Xn = 0.96422
Yn = 1.00000
Zn = 0.82521
```

## Runtime flow

```text
relative XYZ D50 (Y=1 white scale)
→ CIELAB D50
→ CIE76 Master candidate search
→ bound Hxxx_Lxxx_Cxxx reference
```

The original XYZ value remains `REQUEST_ONLY`. Only the bound `Hxxx_Lxxx_Cxxx` record is an ARBE identity.

## Claim boundary

XYZ values do not, by themselves, prove measurement geometry, observer, instrument calibration, sample substrate, source provenance or spectral reflectance. The Gateway accepts the declared D50/Y=1 interpretation as an input contract and returns deterministic communication-space routing evidence.

This is not spectral AtlasFit validation, visual equivalence, third-party certification or production approval. Spectral Scissor, recipe solving, Reference Lock and the Metamerism Gate remain downstream operations.
