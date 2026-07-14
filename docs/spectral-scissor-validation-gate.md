# Spectral Scissor validation gate

`POST /api/scissor/validate` validates supplied Spectral Scissor evidence against the verified ARBE Master runtime repository.

## Lock rule

`SCISSOR_LOCKED` is returned only when all three conditions are true:

1. `crossingsAfter == 0`
2. the corrected curve still resolves to the target reference at AtlasFit rank 1
3. `abs(deltaDeltaLambdaNm) <= allowedLambdaDriftNm`

Any failed condition returns `SCISSOR_UNLOCKED`. Malformed references, counters, drift limits or spectral curves return `SCISSOR_INVALID`.

## Current boundary

This pull request implements the contract and gate, not the correction algorithm itself. A caller must supply the corrected target curve and the measured Scissor evidence. The next implementation step is to port and independently verify the deterministic crossing-removal and topology-correction algorithm before the gate.

A Scissor lock is not a final MixLock verdict. The corrected target still requires a second recipe solution, a new AtlasFit evaluation and the Metamerism Gate. No response is a production approval.
