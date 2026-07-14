# AtlasFit spectral evidence API

`POST /api/atlasfit/evaluate` evaluates a supplied 36-band candidate reflectance curve against every reference in the verified ARBE Master runtime repository.

## Request

```json
{
  "targetReference": "H120_L050_C040",
  "candidateSpectrum": {
    "wavelengthsNm": [380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730],
    "reflectance": [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]
  }
}
```

## Evidence

The response reports:

- nearest Master reference;
- target reference;
- target rank;
- target spectral RMSE;
- nearest and second-nearest RMSE;
- lock margin;
- number of compared Master references;
- verified dataset identity and SHA-256.

The deterministic ranking method is `SPECTRAL_RMSE_36_BAND_380_730_10NM`. Ties are resolved by canonical ARBE reference identity.

## Status rule

`REFERENCE_LOCKED` is returned only when:

1. the target reference exists in the Master runtime repository;
2. the target has rank 1;
3. the nearest reference equals the target reference.

Otherwise the status is `REFERENCE_UNLOCKED` or `TARGET_REFERENCE_NOT_FOUND`.

## Claim boundary

This endpoint evaluates a candidate curve. It does not prove that a pigment recipe, substrate or production process will reproduce that curve. It does not run Spectral Scissor, recompute a scissored target, run the Metamerism Gate or approve production.

The full MixLock workflow remains:

```text
recipe candidate
→ candidate curve
→ mandatory Spectral Scissor
→ corrected target curve
→ second recipe
→ AtlasFit evidence
→ Metamerism Gate
→ final verdict
```
