# Spectral Intelligence Evidence Package v1

WP05.9 consolidates the verified Spectral Intelligence Report Binding and the verified Structural Cause Indicator Report Binding for one existing ARBE reference and one Gateway evidence chain.

## Purpose

```text
Verified Gateway Evidence
        ├─ Spectral Intelligence Report Binding
        └─ Structural Cause Indicator Report Binding
                         │
                         ▼
       Spectral Intelligence Evidence Package v1
```

The package transports the complete verified evidence context without creating a new scientific conclusion.

## Integrity and consistency

The package requires:

- valid integrity on both source reports;
- the same `Hxxx_Lxxx_Cxxx` target reference;
- the same Gateway report digest;
- the same decision digest;
- the same evidence digest;
- unchanged source-report payload digests;
- canonical JSON v1 SHA-256 integrity for the package payload.

Any target mismatch, evidence-chain mismatch or payload tampering invalidates the package.

## Deliberate boundary

The package preserves spectral findings, structural interpretations and bounded investigation candidates. It does not establish root cause, identify a pigment or substrate, certify visual or spectral equivalence, approve a recipe or grant production release.

Integrity confirms deterministic payload consistency. It is not scientific validation for a material, instrument or production process.
