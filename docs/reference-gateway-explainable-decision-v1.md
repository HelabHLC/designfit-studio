# Reference Gateway Explainable Decision v1

WP03.4 projects a verified Reference Gateway Decision Object into a deterministic, human-readable explanation.

## Explanation flow

```text
REQUEST
→ NORMALIZATION
→ TRANSFORMATION (when applicable)
→ SEARCH
→ OUTCOME
→ GOVERNANCE
```

The explanation is linked to both the Decision Object SHA-256 and the underlying Evidence Chain SHA-256. It does not add inference, probability, confidence scores or undocumented claims.

## Output

- a stable `WHY_THIS_GATEWAY_DECISION` question identifier;
- a concise headline;
- ordered explanation items derived from the Runtime Trace;
- a factual conclusion for bound and unavailable outcomes;
- the original claim boundary and limitations.

## Deliberate boundary

Explainable Decision v1 explains the recorded Gateway path. It does not establish spectral equivalence, visual identity, measurement provenance, recipe suitability, certification or production approval. Only an existing `Hxxx_Lxxx_Cxxx` record is an ARBE identity.
