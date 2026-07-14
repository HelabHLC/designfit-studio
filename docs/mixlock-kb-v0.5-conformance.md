# ARBE AtlasFit MixLock KB v0.5 conformance baseline

This repository registers the clean no-data KB archive as an external frozen conformance source.

## Source provenance

- Archive SHA-256: `82900bb48d02419296cab53619812b52af78e9a0bacb60039bed1895c75e0830`
- Archive size: `687560` bytes
- KB version: `0.5`
- Generated date: `2026-06-26`
- Status: `KB_FROZEN_FOR_REPEATABLE_ATLASFIT_TESTING`

The archive intentionally excludes the Master PKL and `pigments.rs`. Their identifiers and hashes are registered, but the files are not redistributed.

## Golden reference

The first frozen end-to-end reference is:

```text
H075_L080_C100
```

The committed acceptance fixture captures three independent checkpoints:

1. baseline pigments candidate and reference lock;
2. Spectral Scissor v0.4 probe;
3. second recipe against the scissored target curve.

The Scissor probe is deliberately expected to remain `SCISSOR_UNLOCKED` at the default 5 nm structural gate because:

```text
|delta-delta-lambda| = 7.111826578730046 nm
```

Crossing removal and preserved nearest reference alone are therefore insufficient for `SCISSOR_LOCKED`.

## Claim boundary

These fixtures freeze observed behavior from the supplied KB. They do not redistribute source datasets, certify third-party pigment data, establish production approval, or replace runtime verification against the configured Master repository.
