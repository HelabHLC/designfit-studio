# Metamerism Gate

The Metamerism Gate qualifies an already reference-locked result under multiple illuminants.

## Required sequence

```text
Reference lock
→ multi-illuminant colorimetric evaluation
→ maximum Delta E00
→ LOW / WARNING / RISK classification
```

The gate never creates or changes the ARBE identity. The atlas reference remains the valid identity.

## Endpoint

```http
POST /api/metamerism/evaluate
```

Required evidence:

- canonical target reference;
- confirmed prior reference lock;
- at least two distinct illuminants;
- one non-negative Delta E00 value per illuminant;
- explicit warning and risk thresholds.

Possible statuses:

```text
REFERENCE_LOCKED_METAMERISM_LOW
REFERENCE_LOCKED_METAMERISM_WARNING
REFERENCE_LOCKED_METAMERISM_RISK
METAMERISM_INVALID
```

## Deliberate boundary

This increment classifies supplied colorimetric evidence. It does not yet calculate Lab values from spectra under alternate illuminants. The upstream calculator must document illuminant SPDs, observer functions, chromatic adaptation and the Delta E00 implementation. Thresholds are run parameters, not automatic production tolerances.
