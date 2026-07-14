# MixLock candidate evaluation

`POST /api/mixlock/evaluate` creates one recipe candidate from supplied pigment spectra and weights, computes its candidate reflectance curve with the current Kubelka–Munk K/S approximation, and submits that curve to the AtlasFit spectral evidence layer.

## Input

- canonical target reference `Hxxx_Lxxx_Cxxx`;
- one or more pigment candidate records;
- each pigment record contains an external/local identifier, a non-negative weight and a 36-band reflectance spectrum on 380–730 nm in 10 nm steps.

## Output

- normalized recipe weights;
- computed candidate curve;
- AtlasFit nearest reference, target rank, spectral RMSE and lock margin;
- verified Master-runtime provenance;
- verdict `RECIPE_CANDIDATE`.

## Scientific boundary

The current mixture model is an opaque infinite-layer Kubelka–Munk approximation. It does not include substrate calibration, concentration-series fitting, pigment scattering calibration, layer thickness, binder, gloss, wet-to-dry effects or process variation.

Pigment spectra are candidate-space inputs. They are not ARBE reference identities and are not bundled merely because this endpoint accepts them.

## Mandatory next gate

This endpoint is not a final MixLock workflow. The following stages remain mandatory before any final verdict:

1. Spectral Scissor;
2. corrected target curve;
3. second recipe solution;
4. AtlasFit re-evaluation;
5. Metamerism Gate.

A `REFERENCE_LOCKED` result nested inside this response applies only to the supplied first candidate curve. The top-level verdict remains `RECIPE_CANDIDATE`. It is not production approval.
