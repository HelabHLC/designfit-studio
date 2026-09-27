# FP Platform reference pilot — H055_L060_C085

Status: prepared locally, **not imported into the FP Platform master**.

## Verified source

The reconciled source pickle has 13,283 unique and valid atlas identities. All
rows declare a CXF-present, exactly reconciled 380–730 nm spectrum at 10 nm
steps. The target is `H055_L060_C085`, `#EA6700`, RGB `(234, 103, 0)`,
Lab `(60.0000, 48.7540, 69.6279)`. `prepare_fp_reference_pilot.py` emits the
36 measured atlas-remission points and a SHA-256 manifest. The source CXF is
`HLC-Colour-Atlas-XL_SpectralData_v1-2.cxf`; observe the existing freieFarbe
attribution and release notices when distributing the derivative.

## Current live FP Platform 5.2.0

- Its own `arbe_fp_color_master` has two `demo_master` rows, neither the target.
- Its `arbe_fp_color_curves` has zero points; 12 pigments and 432 pigment curve
  points are present, with demo/not-validated status in the public ranking.
- The built-in measured-reference CSV importer requires the colour to exist
  in `arbe_fp_color_master` first. It cannot create that master row.
- The FP Platform parser previously stripped only `FP::` from a long input,
  leaving all subsequent `::` fields in the lookup key. The live parser now
  extracts the leading HLC ID; a long FP input for the existing demo reference
  successfully displayed a ranking on 2026-09-27.
- `/wp-json/arbe/v1/diagnostics` reports missing items named after importer
  functions and `status: fail`. Investigate this separate diagnostic before a
  production rollout. `/wp-json/arbe/v1/health` reported `status: ok`.

## Controlled next step

Register the target master row through a reviewed plugin-owned import path,
then import `out/H055_L060_C085_reference_curves.csv` using the FP Platform's
reference-curve importer. Verify 36 points and `measured` reference mode before
trying the user's complete FP string. Compare the returned reference and curve
against this manifest. Treat the 12 current pigment candidates as a demo;
do not publish rankings as validated pigment recipes or production advice.

A direct SQL INSERT into the live FP master was rejected by automatic approval
review. Do not route the same write through another mechanism without a clear
authorization for the specific production data change. No live colour or curve
row was added during this pilot preparation.
