# ARBE Atlas Repository v0.1

## Purpose

The Atlas Repository provides a versioned, auditable boundary for open colour-reference datasets used by ARBE DesignFit Studio.

The first target dataset is the **HLC Colour Atlas XL associated with Freie Farbe e.V.** ARBE does not rename or claim ownership of that atlas. Dataset title, source, version, licence and record count remain explicit metadata.

## Implemented in this sprint

- strict canonical `Hxxx_Lxxx_Cxxx` validation;
- CSV ingestion for `atlasId`, `L`, `a`, `b` and optional `hex` and `name` columns;
- duplicate-ID rejection;
- dataset metadata and record-count validation;
- registration of multiple dataset versions;
- exact lookup by atlas ID;
- automated tests using a deliberately small fixture.

## CSV contract

Required header columns:

```text
atlasId;L;a;b
```

Optional columns:

```text
hex;name
```

The default delimiter is semicolon. Comma and tab can be selected explicitly.

## Version and provenance rules

Every import must declare:

- `datasetId`;
- official dataset title;
- version;
- source;
- licence where available;
- optional release date and checksum.

No imported row is treated as an ARBE `REFERENCE_LOCKED` result merely because it exists in the repository. The Atlas Repository establishes identity and provenance; validation remains the responsibility of the Reference Engine and later AtlasFit/spectral workflows.

## Important current limitation

The complete official HLC Colour Atlas XL file is **not committed in this pull request**. The included test rows are fixtures only. Full ingestion requires the released source file and confirmed licence/provenance metadata. This avoids silently reconstructing, scraping or inventing atlas records.

## AtlasFit foundation

Exact lookup is the first prerequisite. The next layer will add:

1. indexed Lab/HLC search;
2. candidate ranking;
3. distance reporting with named method and parameters;
4. evidence-aware handoff to the Reference Engine;
5. optional spectral tie-breaking where measured data are available.
