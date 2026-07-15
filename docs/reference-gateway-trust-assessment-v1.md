# Reference Gateway Trust Assessment v1

WP03.5 adds a deterministic, rule-based evidence-status assessment for a verified Reference Gateway Decision Object.

## Why no score?

The assessment deliberately avoids stars, percentages, probabilities and AI confidence values. Such numbers would imply precision that the Gateway evidence does not establish.

Instead, each domain receives an explicit status:

```text
VERIFIED
RECORDED
NOT_REQUIRED
NOT_AVAILABLE
NOT_PERFORMED
NOT_GRANTED
```

## Assessed domains

```text
DECISION_INTEGRITY
REQUEST_IDENTITY
TRANSFORMATION_EVIDENCE
REFERENCE_BINDING
SPECTRAL_VALIDATION
PRODUCTION_AUTHORITY
```

The assessment distinguishes verified Gateway evidence from work that has not been performed. A successful reference binding therefore does not imply spectral validation or production authority.

## Overall status

```text
EVIDENCE_VERIFIED_REFERENCE_BOUND
EVIDENCE_VERIFIED_NO_REFERENCE_BOUND
```

These statuses describe the verified Gateway record only. They are not colour-quality grades.

## Deliberate boundary

Trust Assessment v1 does not establish spectral equivalence, visual identity, measurement provenance, recipe suitability, certification or production approval. Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
