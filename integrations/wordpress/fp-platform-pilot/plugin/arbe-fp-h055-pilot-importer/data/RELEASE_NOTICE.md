# ARBE HLC Reference Engine runtime data v1

## Credit and licence

Original HLC Colour Atlas XL v1.2 colour addresses, spectral data and available
sRGB values: **Copyright (c) freieFarbe e.V.**

- Original package: https://freiefarbe.de/thema-farbe/software/
- Publisher's licence explanation: https://freiefarbe.de/licence/
- zlib licence text: https://opensource.org/license/zlib

freieFarbe e.V. states on its licence page that its Atlas database products,
including the HLC CxF files, are distributed under the zlib licence. That
licence permits alteration and redistribution, including commercial use. The
package's German and English readmes also state CC BY-ND 4.0 for the package
in general; the publisher's file-type-specific licence page distinguishes
the Atlas PDFs (CC BY-ND 4.0) from database products (zlib). This release
contains no Atlas PDF, CxF, XLS, CGATS, or original package archive.

## Changes and additions

This CSV is an **altered runtime export**, not an original freieFarbe file.
ARBE λ* / ATLAS Clarus selected 14 fields from its reconciled v1 master:

| CSV fields | Origin / treatment |
| --- | --- |
| `reference` | Atlas HLC address; all 13,283 match the vendor CxF IDs. |
| `lab_L`, `lab_a`, `lab_b` | HLC target converted to Cartesian Lab in the ARBE master; values agree with `L`, `C cos(H)`, `C sin(H)` within source precision. |
| `hex`, `rgb` | Display sRGB values in the ARBE master. All 10,979 nonempty vendor XLS HEX values agree exactly; 2,304 vendor XLS HEX cells are blank and have ARBE master display values. RGB agrees with HEX for every CSV row. These display values are not measured production colours. |
| `lambda_v2_nm`, `lambda_ee_nm`, `delta_lambda_nm`, `mu2_nm2`, `sigma_star_nm`, `mu3_nm3` | ARBE-computed descriptors stored in the reconciled master, based on the source spectra. This release verifies the spectrum input and the export, not an independent recalculation of these algorithms. |
| `lambda_v2_method`, `atlas_identity_valid` | ARBE processing method and validation flag. |

The 36 reflectance values at 380–730 nm in each of the 13,283 master rows
match the official freieFarbe CxF (maximum Float32 difference below 3×10⁻⁸).
The export is byte-identical to the CSV produced by the included
`tools/export_runtime_master.py` from the checksum-locked v1 Pickle. The
Pickle itself is not distributed: it is a Python executable serialization.

The CSV is a digital reference for lookup. Its values do not certify a
physical match, print process, material formulation, or production output.
The frozen ATLAS Clarus PKL identity, A′ v0.4, and 4C/ECG paths are not changed.
