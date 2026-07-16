# Spectral Moment Descriptor v1

WP05.3 adds an atlas-bound deterministic descriptor for the global structure of a reflectance spectrum.

## Descriptor

```text
lambda*_V2
lambda*_EE
Delta lambda* = lambda*_V2 - lambda*_EE
mu2 = reflectance-weighted second central moment
sigma = sqrt(mu2)
mu3 = standardized reflectance-weighted third central moment
```

## Units

- `lambdaV2Nm`, `lambdaEeNm`, `deltaLambdaStarNm`, and `sigmaNm`: nanometres;
- `mu2Nm2`: square nanometres;
- `mu3Standardized`: dimensionless.

The sign of standardized `mu3` is recorded as:

```text
SHORTWAVE  mu3 < 0
SYMMETRIC  |mu3| <= 1e-12
LONGWAVE   mu3 > 0
```

## Deterministic method

The descriptor uses the canonical ARBE lambda*_V2 Brent runtime and reflectance-weighted continuous central moments integrated by the trapezoidal rule over the supplied spectral interval.

## Atlas binding

Every descriptor requires an existing identity-shaped target reference:

```text
Hxxx_Lxxx_Cxxx
```

The reference binds the descriptor to the intended ARBE target. The descriptor does not create a new identity.

## Deliberate boundary

The descriptor characterizes global spectral position, spread and asymmetry. It does not by itself identify pigment, substrate or root cause; establish spectral equivalence or visual identity; approve a recipe; certify a match; or grant production release.
