# Spectral Scissor structural drift lock

This increment connects the deterministic Spectral Scissor correction to the normative ARBE structural drift calculation and the existing lock gate.

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

The structural descriptors are defined as:

```text
delta_lambda_candidate = lambda_V2_candidate - lambda_EE_candidate
delta_delta_lambda = delta_lambda_candidate - delta_lambda_master
```

The diagnostic drift bands are:

```text
abs(delta_delta_lambda) <= 5 nm   STABLE
<= 10 nm                           WATCH
<= 20 nm                           REVIEW
> 20 nm                            BLOCK
```

The API does not silently select the lock tolerance. `allowedLambdaDriftNm` is required in the request and is reported in the evidence.

## Endpoint

```http
POST /api/scissor/lock
```

A `SCISSOR_LOCKED` verdict is possible only when all existing gate conditions pass:

1. no crossings remain;
2. AtlasFit preserves the target reference at rank 1;
3. the computed absolute delta-delta-lambda remains within the supplied allowed drift.

## Claim boundary

This is a Spectral Scissor reference-lock result for the corrected curve. It is not the final MixLock verdict. The second recipe solution and Metamerism Gate remain mandatory before final workflow completion. The current correction operator is v0.3; the v0.4 constrained refinement is not yet included.
