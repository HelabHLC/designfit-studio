# ARBE Reference Engine v0.1

## Purpose

The Reference Engine is the stable domain boundary between creative requests and ARBE colour references.

It does not invent colours, certify production matches, or treat HEX, RGB, Lab, names, images, Pantone or RAL requests as final ARBE identities.

## Canonical identity

A canonical ARBE atlas identifier follows:

```text
Hxxx_Lxxx_Cxxx
```

The initial implementation validates this syntax only. Membership in a specific released HLC Colour Atlas XL dataset will be added through an atlas repository adapter.

## Evidence

Every reference declares one evidence level:

- `MEASURED`
- `CALCULATED`
- `SIMULATED`
- `ESTIMATED`
- `PROXY`
- `VALIDATED`
- `NOT_AVAILABLE`

A reference is returned as `REFERENCE_LOCKED` only when its evidence is `VALIDATED`. Other evidence levels remain `REFERENCE_CANDIDATE`.

## Open reference foundation

The open reference layer is designed around the HLC Colour Atlas XL associated with Freie Farbe e.V. ARBE adds software orchestration, evidence handling, spectral and material analysis without renaming that atlas as an ARBE-owned atlas.

## Current boundary

Version 0.1 provides:

- atlas identifier syntax validation;
- a repository contract;
- an in-memory adapter;
- reference lookup;
- explicit not-found errors;
- structured evidence explanations.

It does not yet provide:

- full Atlas XL ingestion;
- nearest-neighbour AtlasFit;
- spectral comparison;
- material feasibility;
- lighting simulation;
- MixLock validation.
