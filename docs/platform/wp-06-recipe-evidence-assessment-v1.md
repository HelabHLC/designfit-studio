# Recipe Evidence Assessment v1

WP06.2 applies the Recipe Intelligence Contract v1 to one explicit evidence set.

## Outcome logic

- missing mandatory evidence → `RECIPE_EVIDENCE_INCOMPLETE`;
- watch or review evidence → `RECIPE_TECHNICAL_REVIEW_REQUIRED`;
- blocking evidence → `RECIPE_BLOCKED_BY_EVIDENCE`;
- all mandatory evidence present without adverse findings → `RECIPE_CANDIDATE_REVIEWABLE`.

Material and process context remains separately visible. Its absence does not prevent purely analytical review, but it prevents physical or production qualification.

## Evidence states

```text
PRESENT
WATCH
REVIEW
BLOCK
MISSING
```

Each of the seven contract requirements must be supplied exactly once with a non-empty evidence statement.

## Boundary

The assessment classifies supplied evidence. It does not recompute the underlying science, prove a global optimum, identify pigments, certify spectral or visual equivalence, approve a recipe or grant production release.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
