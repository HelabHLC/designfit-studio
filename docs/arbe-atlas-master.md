# ARBE Atlas Master integration

## Verified source

The inspected master file is a Pandas DataFrame with:

- 13,283 rows;
- 114 columns;
- 13,283 unique `reference` identities;
- zero invalid atlas identities;
- 36 reflectance columns from `R_380` through `R_730`;
- ARBE λ*_V2, equivalent-wavelength, structural-moment, illuminant-extension and ΔE00-derived fields.

The immutable file fingerprint is recorded in `datasets/manifests/arbe-atlas-master-v2-illumext.json`.

## Architectural role

The HLC Colour Atlas XL remains the original external reference foundation. The ARBE Atlas Master is an enriched internal decision dataset derived around that reference basis.

```text
HLC Colour Atlas XL
        ↓ provenance and source spectra
ARBE Atlas Master
        ↓ enriched decision fields
MasterRepository
        ↓ typed application access
Reference Engine / AtlasFit / ARIA
```

## Binary-data rule

The PKL must not be modified in place. Runtime use requires:

1. an explicit configured file path;
2. SHA-256 verification against the manifest;
3. row-count and column-count verification;
4. identity uniqueness and syntax verification;
5. a controlled conversion boundary from Python/Pandas data into typed records.

The browser-facing Next.js application must never unpickle arbitrary user-supplied files. Pickle loading belongs in a trusted server-side ingestion process because Python pickle can execute code during deserialization.

## Repository boundary

`MasterRepository` is the domain contract. The first production adapter should be implemented as a trusted ingestion service that exports a safe, versioned interchange representation such as Parquet, Arrow or validated JSON records. The UI and scientific domain modules should not depend directly on Pandas or pickle.

## Claim boundary

Presence in the master does not automatically imply a production lock. Atlas identity, spectral provenance, computed λ* fields, material feasibility, SCISSOR result and final evidence state remain distinct assertions.
