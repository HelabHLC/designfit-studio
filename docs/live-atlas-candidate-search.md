# Live Atlas Candidate Search

## Endpoint

`POST /api/atlas/candidates`

```json
{
  "lab": { "l": 50, "a": 12, "b": -8 },
  "limit": 10
}
```

The endpoint searches the verified Master-runtime records and returns a deterministic CIE76 ranking with canonical ARBE references.

## Status

A successful response uses:

`REFERENCE_CANDIDATES_FOUND`

Every returned item remains a `REFERENCE_CANDIDATE`.

## Boundary

This endpoint is a candidate prefilter. It does not establish a Reference Lock, validate a pigment recipe, execute Spectral Scissor, qualify metamerism or approve production.

The runtime dataset remains server-side and is identified in the response by dataset ID, SHA-256 and verification status.

## Next step

The next scientific step is to add the stricter AtlasFit evidence layer, including target rank, spectral RMSE and lock margin. CIE76 is retained here only as an explicit and auditable first-stage search metric.
