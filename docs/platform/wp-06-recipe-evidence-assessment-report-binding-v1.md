# Recipe Evidence Assessment Report Binding v1

WP06.3 makes the deterministic Recipe Evidence Assessment v1 reportable and integrity-bound.

## Purpose

The binding preserves one recipe-evidence assessment without reinterpreting its findings. It carries the target ARBE reference, analytical outcome, mandatory-evidence count, material-and-process-context status, next action and all seven contract findings in one canonical report payload.

## Integrity

The payload is canonicalized with `ARBE_CANONICAL_JSON_V1` and protected by SHA-256. Verification checks:

- `Hxxx_Lxxx_Cxxx` target-reference syntax;
- supported assessment schema;
- exactly six mandatory requirements;
- exactly seven contract findings;
- consistent outcome, counts, context and next action;
- preservation of the `RECIPE_APPROVED` and `PRODUCTION_RELEASE_GRANTED` prohibitions;
- canonical payload integrity.

## Boundary

The binding does not recompute AtlasFit, Spectral Intelligence or metamerism evidence. It does not prove a global optimum, identify pigments, certify spectral or visual equivalence, approve a recipe or grant production release.

A `RECIPE_CANDIDATE_REVIEWABLE` result means only that the supplied evidence is contract-complete for analytical review.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
