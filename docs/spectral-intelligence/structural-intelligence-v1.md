# Structural Intelligence v1

WP05.5 adds a deterministic interpretation layer over atlas-bound structural evidence.

## Inputs

```text
Reference Moment Descriptor
Candidate Moment Descriptor
Structural Drift
Spectral Window Structure
Metamerism Evidence (optional)
Explicit Assessment Policy
```

All reference-bearing inputs must identify the same existing ARBE identity:

```text
Hxxx_Lxxx_Cxxx
```

## Interpreted domains

- `DELTA_LAMBDA`: atlas-relative ΔΔλ* status from Structural Drift;
- `DISPERSION`: candidate-reference change in σ = √μ₂;
- `SKEWNESS`: candidate-reference change in standardized μ₃;
- `WINDOW_STRUCTURE`: no difference, localized, distributed or oscillatory topology;
- `METAMERISM`: classification of supplied upstream multi-illuminant evidence.

Each domain records one of:

```text
PASS
WATCH
REVIEW
BLOCK
NOT_PERFORMED
```

The overall state is:

```text
STRUCTURAL_EVIDENCE_INCOMPLETE
STRUCTURALLY_STABLE
STRUCTURAL_WATCH
STRUCTURAL_REVIEW
STRUCTURAL_BLOCK
```

## Explicit policy

Dispersion, skewness and window-topology thresholds are mandatory run parameters. They are copied into the result and are not hidden defaults.

These parameters are analytical assessment rules. They are not production tolerances unless separately approved for a defined material, process and measurement condition.

## Window interpretation

The window layer distinguishes:

```text
NO_DIFFERENCE
LOCALIZED
DISTRIBUTED
OSCILLATORY
```

This is a description of local difference topology. It is not a pigment, substrate, coating, process or measurement diagnosis.

## Deliberate boundary

Structural Intelligence v1 interprets supplied evidence but does not identify root cause, establish visual identity or spectral equivalence, approve a recipe, certify a match or grant production release.
