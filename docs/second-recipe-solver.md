# Second recipe solver

This increment adds the second recipe stage required after Spectral Scissor correction.

## Runtime flow

```text
scissored target curve
→ candidate pigment spectra
→ deterministic weight search
→ Kubelka–Munk candidate curve
→ spectral RMSE to scissored target
→ AtlasFit against verified Master Runtime
```

## Endpoint

```http
POST /api/mixlock/solve-second
```

The solver starts from the supplied pigment weights, normalizes them and performs deterministic pairwise weight transfers with a progressively smaller step size. The objective is spectral RMSE against the corrected Scissor target curve.

The result is explicitly reported as:

```text
SECOND_RECIPE_CANDIDATE
```

It is not a final MixLock verdict.

## Deliberate boundaries

- The search is deterministic but local; it does not prove a global optimum.
- The mixing model remains the opaque infinite-layer Kubelka–Munk approximation.
- Candidate pigment spectra are local candidate-space inputs, not ARBE colour identities.
- No substrate, scattering, concentration-series or wet-to-dry calibration is asserted.
- The Metamerism Gate remains mandatory after the second recipe is evaluated and reference-locked.
- No production approval is issued.
