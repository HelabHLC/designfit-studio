# Reference Gateway Decision Object v1

WP03.3 introduces a single deterministic contract that binds the Gateway result, Evidence Chain and Runtime Trace without collapsing them into one unstructured payload.

## Structure

```text
Gateway Result
      │
      ├─ Evidence Chain + SHA-256
      │
      ├─ Runtime Trace linked to Evidence SHA-256
      │
      └─ Decision Payload + SHA-256
```

The decision payload records:

- request kind and `REQUEST_ONLY` identity rule;
- terminal Gateway status;
- bound `Hxxx_Lxxx_Cxxx` reference when available;
- binding method;
- candidate count;
- source Evidence Chain digest;
- Runtime Trace schema;
- claim boundary and limitations.

## Verification

Verification checks both cryptographic integrity and cross-object consistency. A decision fails verification when the payload, Gateway result, Evidence Chain or Runtime Trace no longer agree.

## Determinism

No timestamp, random identifier, host value or duration is included. The same Gateway result produces the same Decision Object and digest.

## Claim boundary

The Decision Object records and binds a Gateway decision. It does not establish spectral equivalence, visual identity, measurement provenance, recipe suitability, certification or production approval. Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
