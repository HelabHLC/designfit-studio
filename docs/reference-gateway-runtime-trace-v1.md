# Reference Gateway Runtime Trace v1

WP03.2 derives a stable, human-readable runtime trace from an integrity-bound Reference Gateway Evidence Chain.

## Trace flow

```text
REQUEST
→ NORMALIZATION
→ TRANSFORMATION (when applicable)
→ SEARCH
→ OUTCOME
→ GOVERNANCE
```

Each entry records a stable sequence, stage, evidence event, recorded status and concise explanation. The trace also binds back to the source Evidence Chain through its SHA-256 payload digest.

## Determinism

Runtime Trace v1 deliberately excludes timestamps, durations, random identifiers, host information and other environment-dependent values. The same Evidence Chain therefore produces the same trace.

Operational timing and observability metadata may be introduced later in a separate non-deterministic telemetry envelope. They must not alter the evidence-bound trace.

## Claim boundary

The trace explains the steps recorded by the Gateway. It does not establish spectral equivalence, visual identity, measurement provenance, certification, recipe suitability or production approval. Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
