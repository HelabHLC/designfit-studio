# HLC Colour Atlas XL v1.2 — full smoke test

Date: 2026-07-13

Source package: `HLC-Colour-Atlas-XL_Set_DE_v1-2.zip`

Spectral source: `HLC-Colour-Atlas-XL_SpectralData_CGATS_v1-2.txt`

Author / originator: freieFarbe e.V.

Licence stated in the package: Creative Commons CC BY-ND 4.0.

## Integrity

- CGATS SHA-256: `7ed2a376dc1a338cae6d2d4eadb99cd7d20c124e32a4806fb5892649b6cf8114`
- Declared records: **13,283**
- Parsed records: **13,283**
- Unique canonical IDs: **13,283**
- Duplicate IDs: **0**
- First ID: `H000_L005_C000`
- Last ID: `H360_L090_C010`

## Spectral validation

- Wavelength range: **380–730 nm**
- Increment: **10 nm**
- Spectral values per record: **36**
- Minimum reflectance: **0.0000**
- Maximum reflectance: **0.9718**
- Non-finite values: **0**
- Values outside 0–1: **0**

Result: **PASS**.

## First AtlasFit candidate search

The first implementation uses explicitly named **CIE76** distance in target Lab space. This is a candidate-ranking baseline, not a production lock and not the final ARBE spectral decision method.

### Exact-identity control

Target: Lab derived from `H005_L085_C010`

1. `H005_L085_C010` — distance `0.000000`
2. `H010_L085_C010` — distance `0.872388`
3. `H360_L085_C010` — distance `0.872388`

The canonical identity is correctly returned at rank 1.

### External Lab example

Target: `L*=47.94, a*=66.30, b*=44.76`

1. `H035_L050_C080` — CIE76 `2.470083`
2. `H035_L045_C080` — CIE76 `3.240572`
3. `H035_L050_C075` — CIE76 `5.561648`
4. `H035_L050_C085` — CIE76 `5.592020`
5. `H035_L045_C075` — CIE76 `5.944066`

These are **reference candidates only**. A later AtlasFit stage must add named perceptual methods, spectral comparison, asymmetric/tie-break logic, evidence status and claim boundaries before any reference lock is emitted.

## Data handling boundary

The original freieFarbe files remain unchanged and are not relabelled as ARBE-owned data. This report records validation results and importer behaviour; it does not redistribute a modified atlas.
