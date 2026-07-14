# Final MixLock orchestrator

This increment connects the existing executable stages into one strict, audit-oriented sequence.

```text
initial pigment recipe
→ candidate spectrum
→ Spectral Scissor correction and lock
→ second recipe against corrected target
→ AtlasFit rank-1 reference check
→ Metamerism Gate
→ final reference-lock verdict
```

A final result is returned only when:

1. the Spectral Scissor stage is `SCISSOR_LOCKED`;
2. the second recipe routes to the target Master reference at rank 1;
3. the Metamerism Gate returns LOW, WARNING or RISK for supplied multi-illuminant evidence.

The final status is one of:

```text
REFERENCE_LOCKED_METAMERISM_LOW
REFERENCE_LOCKED_METAMERISM_WARNING
REFERENCE_LOCKED_METAMERISM_RISK
MIXLOCK_UNLOCKED
MIXLOCK_INVALID
```

## Claim boundary

`FINAL_REFERENCE_LOCK` is an audit result inside the ARBE workflow. It is not production approval. Pigment spectra remain candidate-space inputs. Kubelka–Munk remains an opaque infinite-layer approximation. The second-recipe solver is deterministic but local. Multi-illuminant Delta E00 values are supplied by an upstream calculator until the spectral colorimetry runtime is connected.
