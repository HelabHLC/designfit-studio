# λ*_V2 Master Conformance Suite

This suite executes `ARBE_LAMBDA_V2_BRENT_RUNTIME` against spectra loaded from the verified Master runtime and compares each computed descriptor with the stored Master value and method.

## Endpoint

`POST /api/lambda-v2/master-suite`

Optional body:

```json
{
  "toleranceNm": 0.000001,
  "maxReferences": 256
}
```

References are sorted by canonical ARBE identity and selected at evenly distributed deterministic positions. Setting `maxReferences` greater than or equal to the number of eligible Master records produces `FULL_MASTER` coverage.

## Verdicts

- `LAMBDA_V2_MASTER_SUITE_CONFORMANT`
- `LAMBDA_V2_MASTER_SUITE_NONCONFORMANT`
- `LAMBDA_V2_MASTER_SUITE_UNAVAILABLE`

A conformant sampled run applies only to the tested references. Global runtime conformance requires `coverage: FULL_MASTER`, zero nonconformant references, the verified dataset identity and SHA-256 in the response, and preservation of the frozen implementation ID and version.

This suite is descriptor evidence only. It does not produce a Spectral Scissor lock or a production approval.
