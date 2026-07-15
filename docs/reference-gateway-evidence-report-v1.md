# Reference Gateway Evidence & Trust Report v1

WP04.1 converts a verified Reference Gateway Decision Object into a report-ready, integrity-bound artifact.

## Report structure

```text
Verified Decision Object
        │
        ├─ Gateway outcome
        ├─ Explainable Decision
        ├─ Trust Assessment
        ├─ Claim Boundary
        └─ Report SHA-256
```

The report binds all included views to the same Decision Object digest and Evidence Chain digest. Cross-object mismatches or payload modifications cause report verification to fail.

## Included content

- request kind and Gateway status;
- bound ARBE reference, when available;
- recorded binding method and candidate count;
- deterministic human-readable explanation;
- rule-based evidence and authority statuses;
- claim boundary and known limitations;
- canonical JSON v1 SHA-256 integrity.

## Deliberate boundary

The report documents a Reference Gateway decision. It does not establish spectral equivalence, visual identity, measurement provenance, recipe suitability, certification or production approval. Spectral validation and production authority remain explicitly marked as not performed or not granted unless supplied by later platform layers.

Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
