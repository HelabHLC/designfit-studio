# ARBE HLC Reference Engine WordPress source review

**Status:** v0.1.6 source deployed on the WordPress staging and public sites on 27 September 2026. The checksum-locked runtime CSV and its attribution and provenance files are now included for a tagged source release.

The source is derived from the user-supplied v0.1.5 WordPress archive dated 13 July 2026. The public page uses `[arbe_hlc_reference_tool]`. A separate v1.1.0 plugin registers `[arbe_hlc_reference_engine_v11]` and does not implement this page.

This change repairs frontend technical-validation display, strict HLC/FP parsing, Brent validation for exact lookups, and import failure/count handling. It does not change the matching algorithm. HEX, RGB and Lab request matching uses CIEDE2000 D50/2° against the WordPress runtime master. That route is distinct from the frozen ATLAS Clarus PKL image-pixel assignment based on integer RGB squared distance and the `atlas_row_id` tie-break.

The CSV's precomputed spectral descriptors are displayed, not recomputed by this plugin. No physical measurement, production approval, A′ change, or 4C/ECG change is claimed.

## Verification

- Both GitHub workflows passed on commit `5f64d77`: Reference Engine WordPress source (PHP lint, JavaScript syntax, parser/importer regression) and general CI.
- The included CSV contains 13,283 unique references, SHA-256 `9baa2cdfe75e3489fc94bc92377f5b0509f2f5688a279d92c1201559757f7fd4`. Public WordPress stored values were subsequently matched across all 14 fields after SQL DECIMAL normalization; see `data/PROVENANCE_AUDIT.md`.
- Staging and public WordPress report active plugin v0.1.6, import state `ready`, and 13,283 distinct database references.
- On both sites, REST exact HLC and FP requests returned `H080_L080_C060` with Brent; Lab and HEX requests returned one atlas reference. The formerly accepted embedded text `unverified note H080_L080_C060 trailing` now returns HTTP 400 `INVALID_INPUT`.
- The staging frontend displayed the validated card and rejected the malformed HLC request. The public page renders the updated explanatory text and technical-validation fields. Its REST behavior was checked after installation.

## Dataset release evidence

The original freieFarbe ZIP, CxF spectrum-to-Pickle match, byte-identical
Pickle-to-CSV export, publisher's database-product zlib licence and the
public WordPress stored-value comparison are documented in `data/`.
The six ARBE descriptors are precomputed master fields, not independently
recomputed by this source review. No physical or production claim is made.
