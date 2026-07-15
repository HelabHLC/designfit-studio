# Reference Gateway Evidence Chain v1

WP03.1 introduces a deterministic, integrity-bound evidence object for Reference Gateway results.

## Purpose

The evidence chain records how a normalized request reached its gateway outcome. It does not create a new ARBE identity and does not convert communication-space evidence into spectral or production approval.

## Ordered steps

```text
REQUEST_ACCEPTED
→ REQUEST_NORMALIZED
→ COLORSPACE_TRANSFORMED (when applicable)
→ MASTER_CANDIDATES_RANKED
→ REFERENCE_OUTCOME_RECORDED
→ CLAIM_BOUNDARY_RECORDED
```

Each step has a stable sequence number and contains the evidence available from the completed Gateway result.

## Determinism

The payload deliberately excludes timestamps, random identifiers and environment-dependent values. The same Gateway result therefore produces the same canonical payload and SHA-256 digest.

## Integrity

```text
schema: ARBE_REFERENCE_GATEWAY_EVIDENCE_V1
canonicalization: ARBE_CANONICAL_JSON_V1
algorithm: SHA-256
```

`verifyReferenceGatewayEvidenceChain` recalculates the payload digest and uses timing-safe comparison. A modified request, candidate list, outcome, claim boundary or limitation invalidates the chain.

## Immutability

Produced chains are deep-frozen at runtime and exposed through readonly TypeScript contracts.

## Claim boundary

The evidence chain proves what the Gateway received, normalized, transformed, ranked and returned. It does not prove spectral equivalence, visual identity, measurement provenance, recipe suitability, certification or production approval.
