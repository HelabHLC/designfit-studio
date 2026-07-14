# First Live Reference API

This endpoint exposes a read-only lookup against the verified ARBE Atlas Master runtime export.

## Endpoint

`GET /api/reference/{reference}`

Example:

`GET /api/reference/H180_L050_C040`

## Deployment configuration

The server requires two absolute or process-relative paths:

```text
ARBE_MASTER_RUNTIME_PATH=/secure/runtime/arbe_atlas_master_v2_illumext.jsonl.gz
ARBE_MASTER_MANIFEST_PATH=/secure/runtime/arbe_atlas_master_v2_illumext.manifest.json
```

The provider loads the payload once per server process and caches the verified repository instance. If loading fails, the cache is cleared so a later request can retry after deployment configuration is corrected.

## Verification boundary

Before any record is served, the repository verifies:

- runtime payload byte size;
- SHA-256 checksum;
- canonical 380–730 nm / 10 nm spectral grid;
- declared record count;
- canonical `Hxxx_Lxxx_Cxxx` identities;
- 36 finite reflectance values in the range `0..1`;
- duplicate-reference absence.

## Response statuses

- `REFERENCE_FOUND`
- `REFERENCE_NOT_FOUND`
- `INVALID_REFERENCE_REQUEST`
- `MASTER_RUNTIME_UNAVAILABLE`

## Claim boundary

A successful lookup confirms that an authoritative Master-runtime reference record exists. It does not:

- validate a recipe;
- run Spectral Scissor;
- run the Metamerism Gate;
- establish a Reference Lock;
- approve production.

The runtime dataset remains outside the public Git repository and must be mounted through controlled server-side storage.
