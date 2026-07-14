# AtlasFit MixLock audit contract

## Purpose

This contract defines the evidence boundary for a complete ARBE AtlasFit MixLock run. It does not implement pigment optimisation, Spectral Scissor correction or metamerism computation. It defines what those modules must return before a final status can be emitted.

## Mandatory sequence

1. preserve the original user request;
2. bind the request to one canonical Master-PKL atlas reference;
3. solve an initial recipe candidate in an explicitly identified pigment candidate space;
4. compute the candidate reflectance curve;
5. run the mandatory Spectral Scissor;
6. require zero crossings after correction;
7. derive the corrected target curve and its Lab value;
8. solve a refined recipe against that corrected curve;
9. run AtlasFit against the ARBE Atlas Master PKL;
10. require the target reference to be rank 1 and the nearest reference;
11. run the Metamerism Gate;
12. emit an audit-oriented verdict.

## Reference and candidate spaces

- The final reference space is `ARBE_ATLAS_MASTER_PKL`.
- External pigment libraries and `pigments.rs`-derived records are candidate space only.
- Candidate data may remain `RESTRICTED_INTERNAL` and must not be implied to be bundled or redistributable.

## Scissor lock

`SCISSOR_LOCKED` is accepted only when all conditions are true:

- `crossingsAfter === 0`;
- `nearestAfterCorrection === targetReference`;
- `abs(deltaDeltaLambdaNm) <= allowedLambdaDriftNm`.

## Reference lock

A reference lock is accepted only when:

- `finalCurveEvidence.nearestReference === targetReference`;
- `finalCurveEvidence.targetRank === 1`;
- the Spectral Scissor lock passed;
- the Metamerism Gate ran.

## Final statuses

- `REFERENCE_LOCKED_METAMERISM_LOW`
- `REFERENCE_LOCKED_METAMERISM_WARNING`
- `REFERENCE_LOCKED_METAMERISM_RISK`
- `REFERENCE_UNLOCKED`
- `NOT_FINAL_MISSING_EVIDENCE`
- `INVALID_INPUT`

No status in this contract means production approval, visual identity, Pantone certification or exact perceptual equivalence.
