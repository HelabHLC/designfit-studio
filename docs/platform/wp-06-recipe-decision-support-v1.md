# Recipe Decision Support v1

WP06.6 converts an existing Recipe Candidate Ranking v1 into bounded workflow actions.

## Controlled actions

- `PRIORITIZE_FOR_CONTROLLED_REVIEW`
- `PERFORM_TECHNICAL_REVIEW`
- `COMPLETE_MISSING_EVIDENCE`
- `RESOLVE_BLOCKING_EVIDENCE`

The top-ranked candidate determines the portfolio status, but remains first in review order only.

## Boundary

Decision Support does not create a new ranking, identify a best recipe, prove a global optimum, approve a formulation, certify spectral or visual equivalence, or grant production release.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity. Candidate IDs and formulation components remain candidate-space data.
