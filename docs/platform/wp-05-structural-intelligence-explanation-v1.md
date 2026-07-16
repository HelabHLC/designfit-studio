# Structural Intelligence Explanation v1

WP05.6 projects a completed Structural Intelligence assessment into an ordered, human-readable and integrity-bound explanation.

## Purpose

The explanation answers:

```text
WHY_THIS_STRUCTURAL_ASSESSMENT
```

It does not run a second assessment and does not add new diagnostic claims.

## Content

- target ARBE reference;
- overall structural status;
- status-specific headline;
- completed-domain summary;
- one section per evidence domain;
- severity-first ordering: `BLOCK`, `REVIEW`, `WATCH`, `NOT_PERFORMED`, `PASS`;
- original evidence status and explanation from Structural Intelligence v1;
- unchanged claim boundary and limitations;
- canonical JSON v1 SHA-256 integrity digest.

## Deterministic behavior

The same Structural Intelligence assessment produces the same explanation and the same digest. No timestamp, random identifier, host value or runtime duration enters the canonical payload.

## Integrity

`verifyStructuralIntelligenceExplanation` recomputes the digest and compares it using timing-safe equality. A changed headline, section, status, limitation or boundary invalidates the digest.

## Deliberate boundary

The explanation is a presentation of supplied evidence. It does not infer pigment, substrate, coating, measurement or process root cause; establish spectral equivalence or visual identity; approve a recipe; certify a match; or grant production release.
