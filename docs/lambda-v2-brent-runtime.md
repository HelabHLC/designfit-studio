# ARBE lambda_V2 Brent Runtime

This module computes the ARBE lambda_V2 energetic balance descriptor on the canonical 36-band 380–730 nm / 10 nm grid.

## Definition

The balance function is:

`g(x) = integral(380..x, 1 - R(lambda)) - integral(x..730, R(lambda))`

`lambda_V2` is the unique root of `g(x) = 0` on `[380, 730]`.

The runtime uses piecewise-linear spectral integration and a bracketed Brent root solver. It reports the method exactly as `Brent`, together with implementation ID, version, tolerance, iteration count and final residual.

## Endpoint

`POST /api/lambda-v2/compute`

The request contains a canonical spectrum and optional numerical tolerance and iteration limit.

## Acceptance boundary

This implementation is now executable, but it is not yet approved as globally conformant. Before it may provide final Spectral Scissor lock evidence, it must pass a frozen multi-reference suite against `lambdaV2Nm` values stored in the verified Master runtime.

A computed descriptor alone does not establish a Reference Lock, Scissor Lock, metamerism status or production approval.
