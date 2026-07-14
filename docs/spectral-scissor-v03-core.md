# ARBE Spectral Scissor v0.3 Core

## Purpose

This module ports the deterministic v0.3 smooth projected-clamp candidate operator into the ARBE λ* runtime.

It accepts two validated 36-band reflectance curves on the canonical 380–730 nm / 10 nm grid and computes a corrected B curve that remains at least `epsilon` above A at every sampled wavelength.

## Algorithm

1. Compute `d0 = R_B - R_A`.
2. Detect zero crossings in `d0`.
3. Compute the hard minimum correction `max(epsilon - d0, 0)`.
4. Smooth only the correction vector with an edge-padded Gaussian kernel.
5. Clamp the smoothed correction to non-negative values.
6. Project it back onto the topology constraint by taking the maximum of the smoothed and required correction vectors.
7. Add the resulting correction to `R_B`.
8. Report crossings, correction RMSE, maximum correction, roughness and physical-range status.

## API

```http
POST /api/scissor/correct
```

The response verdict is always:

```text
SCISSOR_CANDIDATE
```

The corrected curve must still pass `/api/scissor/validate`.

## Scientific boundary

This is the v0.3 deterministic candidate operator. It is not the v0.4 SLSQP constrained refinement.

The runtime currently does not:

- calculate CIE D50/2° Lab for the corrected curve;
- enforce a ΔE00 colour-preservation constraint;
- calculate λ*_V2 or ΔΔλ* drift;
- establish a final Scissor lock by itself;
- solve the second pigment recipe;
- run the Metamerism Gate;
- approve production.

The implementation deliberately reports reflectance values above 1 as `REVIEW_OUT_OF_REFLECTANCE_RANGE` rather than silently clipping them.
