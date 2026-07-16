# Recipe Intelligence Contract v1

WP06.1 defines the evidence and claim contract for future recipe assessment.

## Purpose

The contract prevents recipe optimization from outrunning the available evidence. It defines what must be present before a candidate can be considered reviewable and what the platform must never claim automatically.

## Required evidence

A reviewable candidate requires:

1. a bound existing `Hxxx_Lxxx_Cxxx` target;
2. a deterministic normalized recipe candidate;
3. a candidate spectrum on the canonical 380–730 nm / 10 nm grid;
4. AtlasFit evidence;
5. a verified WP05 Spectral Intelligence Evidence Package;
6. multi-illuminant metamerism evidence.

Material and process context is also required for physical or production qualification, but its absence does not prevent purely analytical candidate review.

## Outcome vocabulary

```text
RECIPE_EVIDENCE_INCOMPLETE
RECIPE_CANDIDATE_REVIEWABLE
RECIPE_TECHNICAL_REVIEW_REQUIRED
RECIPE_BLOCKED_BY_EVIDENCE
```

None of these statuses means production approval.

## Prohibited automatic claims

The contract explicitly prohibits claims that a global optimum was proven, a pigment identity was confirmed, spectral or visual equivalence was certified, a recipe was approved, or production release was granted.

## Identity rule

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity. Recipe components, HEX, Lab, images, named standards and descriptions remain request or candidate-space data unless separately bound through authoritative evidence.
