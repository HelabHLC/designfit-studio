# ARBE Atlas Master PKL ingestion report

## Trusted source

- File: `atlas_master__active_master__v2_illumext.pkl`
- SHA-256: `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`
- Shape: **13,283 rows × 114 columns**

## Validation result

- Unique references: **13,283**
- Duplicate references: **0**
- Invalid `Hxxx_Lxxx_Cxxx` identifiers: **0**
- `atlas_identity_valid`: **true for every row**
- Spectral columns: **36** (`R_380` through `R_730`, 10 nm spacing)
- Reflectance range: **0.0 to 0.9718000292778015**
- `lambda_v2_method`: **Brent**
- `source_atlas`: **decision_ready_v1**
- `source_cxf`: **HLC-Colour-Atlas-XL_SpectralData_v1-2.cxf**

## Runtime conversion

The verified one-way ingestion tool is located at:

```text
tools/ingest_master_pkl.py
```

It performs these steps:

1. Calculate SHA-256 before loading.
2. Refuse the file unless it matches the trusted manifest.
3. Load the pickle only inside the controlled ingestion process.
4. Validate shape, required columns, reference syntax, uniqueness and spectral ranges.
5. Export a non-executable Parquet file with Zstandard compression.
6. Emit a JSON schema and an ingestion report with checksums.

Example:

```bash
python -m pip install -r tools/requirements-ingest.txt
python tools/ingest_master_pkl.py \
  /secure/input/atlas_master__active_master__v2_illumext.pkl \
  --output-dir /secure/output/master-v2
```

## Security boundary

The web application must never call `pandas.read_pickle()` and must never accept an uploaded pickle. Only the trusted, checksum-locked source may enter this one-way offline ingestion process. Runtime services consume the generated Parquet/Arrow-derived representation or a database built from it.

## Claim boundary

Successful ingestion confirms structural integrity of this specific Master PKL. It does not, by itself, certify every derived scientific field, production suitability, pigment feasibility, spectral equivalence or Reference Lock status.
