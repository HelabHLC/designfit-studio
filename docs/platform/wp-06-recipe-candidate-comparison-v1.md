# Recipe Candidate Comparison v1

WP06.5 explains the pairwise review order of two candidates already present in a valid Recipe Candidate Ranking v1.

## Method

The comparison replays the ranking order without introducing a new score:

1. evidence class;
2. missing mandatory evidence;
3. adverse findings;
4. spectral RMSE;
5. candidate ID as deterministic final tie-breaker.

Evidence class always takes precedence over RMSE.

## Outcomes

```text
LEFT_PRIORITIZED_FOR_REVIEW
RIGHT_PRIORITIZED_FOR_REVIEW
EVIDENCE_ORDER_TIE
```

The result records the decisive criterion and all material differences between the selected candidates.

## Boundary

Prioritized for review means review order only. It does not identify a best recipe, prove a global optimum, certify spectral or visual equivalence, approve a recipe, or grant production release.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity. Candidate IDs and recipe components remain candidate-space data.
