# Recipe Candidate Ranking v1

WP06.4 prioritizes multiple recipe candidates using verified evidence and explicit deterministic tie-breakers.

## Purpose

The ranking helps a practitioner decide which candidate should be reviewed or tested first. It does not identify a best recipe and does not prove an optimum.

## Evidence classes

```text
CLASS_A — reviewable evidence, locked reference, stable structure, low metamerism
CLASS_B — watch or technical-review evidence
CLASS_C — incomplete mandatory evidence
CLASS_D — blocking or invalid evidence
```

Class precedence is strict. A lower spectral RMSE cannot move a CLASS_B, CLASS_C or CLASS_D candidate ahead of a CLASS_A candidate.

## Within-class order

Candidates in the same class are ordered by:

1. missing mandatory evidence count;
2. adverse finding count;
3. supplied spectral RMSE;
4. candidate ID as a deterministic final tie-breaker.

No weighted score or probability is produced.

## Required consistency

- at least two candidates;
- unique candidate IDs;
- valid Recipe Evidence Assessment Report Binding v1 for every candidate;
- the same existing `Hxxx_Lxxx_Cxxx` target reference for all candidates;
- finite, non-negative RMSE when supplied.

## Boundary

The result is an analytical prioritization. It does not identify material composition, certify equivalence, approve a recipe, prove a global optimum or grant production release. Recipe components remain candidate-space data and are not ARBE identities.
