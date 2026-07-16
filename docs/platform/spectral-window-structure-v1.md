# Spectral Window Structure v1

WP05.4 adds an atlas-bound deterministic description of local reflectance differences.

## Fixed analytical windows

```text
W380_430  380–430 nm
W440_490  440–490 nm
W500_550  500–550 nm
W560_610  560–610 nm
W620_670  620–670 nm
W680_730  680–730 nm
```

Each window contains six samples on the canonical 380–730 nm / 10 nm grid. The windows are non-overlapping analytical partitions.

## Recorded evidence per window

- signed mean reflectance difference;
- mean absolute reflectance difference;
- RMSE;
- trapezoidally integrated absolute difference in reflectance·nm;
- maximum absolute difference and its wavelength;
- local direction: `NO_DIFFERENCE`, `CANDIDATE_ABOVE`, `CANDIDATE_BELOW`, or `MIXED`;
- sign-change count;
- share of the total integrated absolute difference.

The structure also records global RMSE, global sign changes, total integrated absolute difference and the dominant window.

## Atlas binding

Every analysis is bound to an existing identity-shaped target reference:

```text
Hxxx_Lxxx_Cxxx
```

The reference identifies the intended ARBE target. The window analysis does not create or rename an identity.

## Deliberate boundary

Fixed windows make local deviations visible, but they are not universal pigment bands. Direction, peak wavelength, crossing count or concentration do not by themselves prove pigment, substrate, coating, measurement or process causation.

The result does not establish visual difference, spectral equivalence, recipe suitability, certification or production release.
