# Integrated Spectral Scissor candidate pipeline

`POST /api/scissor/run` connects the verified Master runtime, the deterministic v0.3 correction operator and AtlasFit evidence in one server-side step.

## Flow

1. resolve the canonical target reference from the verified Master runtime;
2. use the target spectrum as the protected reference curve;
3. correct the supplied candidate curve with the v0.3 smooth projected-clamp operator;
4. derive crossing counts from the computed curves;
5. reject corrected spectra outside the physical reflectance range;
6. evaluate the corrected curve against the complete Master runtime with AtlasFit;
7. report the nearest reference after correction.

## Deliberate stop condition

The pipeline returns `SCISSOR_CANDIDATE_READY_FOR_DESCRIPTOR`, not `SCISSOR_LOCKED`.

The following evidence is still missing:

- authoritative lambda_V2 evaluation of the corrected curve;
- delta-delta-lambda drift against the target;
- comparison with the configured drift limit.

Until those values are computed by the canonical descriptor implementation, the descriptor gate remains `PENDING_LAMBDA_V2_EVALUATION` and the verdict remains `NOT_FINAL`.

## Claim boundary

The endpoint does not run the v0.4 constrained optimizer, solve the second recipe, perform the Metamerism Gate or approve production.
