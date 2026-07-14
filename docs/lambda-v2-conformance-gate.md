# lambda_V2 conformance gate

This gate validates descriptor output against the verified Master runtime before the descriptor is allowed to participate in Spectral Scissor lock evidence.

## Endpoint

`POST /api/lambda-v2/conformance`

Required fields:

- `reference`
- `lambdaV2Nm`
- `method`
- `implementationId`
- `implementationVersion`

Optional field:

- `toleranceNm` (default `1e-6`)

## Conformance rule

`LAMBDA_V2_CONFORMANT` requires both:

1. the observed value is within the configured tolerance of the Master value;
2. the observed method exactly matches the Master method, currently `Brent` for the verified dataset.

## Deliberate boundary

This PR does not recreate or approximate the canonical lambda_V2 algorithm. It creates the acceptance gate, provenance contract and regression surface required to connect an authoritative implementation safely.

A single conformant reference is not sufficient to approve an implementation globally. A frozen multi-reference conformance suite covering neutral, chromatic, smooth and difficult spectral shapes remains required before the implementation can drive `SCISSOR_LOCKED`.

No production approval is implied.
