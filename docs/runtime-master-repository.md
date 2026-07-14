# Runtime Master Repository

The runtime repository is the server-side access layer for the verified ARBE Atlas Master export.

## Accepted format

The application accepts a non-executable gzip-compressed JSON Lines export:

- media type: `application/x-ndjson+gzip`;
- one master record per line;
- exactly 36 reflectance values;
- canonical grid from 380 to 730 nm in 10 nm steps;
- canonical identity matching `Hxxx_Lxxx_Cxxx`;
- SHA-256 and byte size locked by a manifest;
- record count locked by a manifest.

The web application does not deserialize Python pickle files.

## Load sequence

1. Read the runtime manifest from controlled server configuration.
2. Read the gzip JSONL payload from controlled storage.
3. Verify byte size.
4. Verify SHA-256.
5. Decompress the payload.
6. Validate every record and the canonical spectral grid.
7. Reject duplicate atlas identities.
8. Expose read-only lookup through `MasterRepository`.

## Claim boundary

Loading a verified master record provides an authoritative reference record for ARBE Core. It does not by itself create an AtlasFit reference lock, validate a pigment recipe, run Spectral Scissor, qualify metamerism or approve production.

## Deployment boundary

The verified runtime export is not committed to the public application repository. Deployment supplies the payload and manifest through controlled server-side storage. Restricted pigment libraries remain separate from this reference repository.
