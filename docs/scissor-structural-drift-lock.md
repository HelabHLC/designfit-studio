# Spectral Scissor structural drift lock

This increment connects deterministic Spectral Scissor correction to the ARBE structural drift calculation and the existing lock gate.

## Runtime flow

```text
Master target spectrum
→ deterministic v0.3 correction
→ corrected candidate spectrum
→ lambda_V2 (Brent)
→ lambda_EE centroid
→ candidate delta-lambda
→ delta-delta-lambda against Master delta-lambda
→ AtlasFit nearest-reference evidence
→ mandatory Scissor validation gate
```

The descriptors are defined as:

```text
delta_lambda_candidate = lambda_V2_candidate - lambda_EE_candidate
delta_delta_lambda = delta_lambda_candidate - delta_lambda_master
```

Diagnostic drift bands:

```text
abs(delta_delta_lambda) <= 5 nm   STABLE
<= 10 nm                           WATCH
<= 20 nm                           REVIEW
> 20 nm                            BLOCK
```

The API does not silently choose a lock tolerance. `allowedLambdaDriftNm` is mandatory and is included in the evidence.

## Endpoint

```http
POST /api/scissor/lock
```

`SCISSOR_LOCKED` is possible only when no crossings remain, AtlasFit preserves the target at rank 1, and the computed absolute delta-delta-lambda remains inside the supplied drift limit.

## Claim boundary

This is a Spectral Scissor reference-lock result for the corrected curve, not the final MixLock verdict. The second recipe solution and Metamerism Gate remain mandatory. The current correction operator is v0.3; v0.4 constrained refinement is not included.
