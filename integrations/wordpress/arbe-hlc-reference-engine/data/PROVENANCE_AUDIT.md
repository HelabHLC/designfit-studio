# Runtime master provenance audit — 2026-09-27

The former candidate gate is superseded by
`runtime-master-v1.release-manifest.json` and `RELEASE_NOTICE.md`.

## Verified chain

1. The user supplied the original freieFarbe HLC Colour Atlas XL v1.2 ZIP.
   Its SHA-256 equals the publisher's published checksum
   `49d0bc10aeb90ee4b6f30d20305dd919caa37eca94e81a80ebf8e23b36ed1bdd`.
   All eight ZIP entries passed integrity checks.
2. Its CxF contains 13,283 distinct HLC objects. The uploaded
   `atlas_master_frame_cxf_reconciled_v1.pkl` has 13,283 rows and 96 columns;
   its 36 `R_380` through `R_730` values per row match the CxF by reference,
   with maximum Float32 storage difference below 3×10⁻⁸.
3. The vendor colour-values XLS has nonempty HEX for 10,979 references; all
   match the master exactly. The remaining 2,304 XLS HEX cells are blank;
   the ARBE master supplies display values for these, without implying that
   they are in sRGB gamut or are measured production values. The master Lab
   agrees with the HLC target transformation to source precision.
4. The included `tools/export_runtime_master.py` selects 14 columns from that
   exact Pickle. Running the same selection and `to_csv(index=False)` produces
   a byte-identical 1,705,918-byte CSV with SHA-256
   `9baa2cdfe75e3489fc94bc92377f5b0509f2f5688a279d92c1201559757f7fd4`.
5. The public WordPress database was read in 14 ordered blocks. Every stored
   field in all 13,283 records matched the CSV after the plugin's four-place
   DECIMAL conversion and normalization of negative zero. All 14 deterministic
   64-bit FNV-1a block fingerprints matched. This is a complete stored-value
   comparison, not a claim that the SQL table has the raw CSV SHA-256 digest.

The exact exporter environment was not frozen. The six ARBE spectral
descriptors in the Pickle were not independently recomputed from the spectra
in this audit. The different v2 active master remains a separate dataset and
is not asserted to be identical to this v1 exporter input.

## Licence and attribution decision

The package readmes broadly state CC BY-ND 4.0 and permit unchanged copying.
The publisher's [licence page](https://freiefarbe.de/licence/) more specifically
states that Atlas PDFs are CC BY-ND 4.0, whereas database products such as the
HLC CxF and ASE files are under the zlib licence, allowing alteration and
redistribution including commercial use. This CSV is an altered database
export rooted in the CxF and the vendor's XLS colour values. The release uses
the publisher's database-product zlib permission as its redistribution basis;
both publisher statements and the modifications are disclosed in
`RELEASE_NOTICE.md`. No vendor PDF or original file is republished here.

Sources: [package download](https://freiefarbe.de/thema-farbe/software/),
[publisher licence](https://freiefarbe.de/licence/),
[repository release policy](https://github.com/HelabHLC/arbe-lambda/blob/main/docs/repository-roles-and-release-policy.md).

The CSV remains a computational lookup dataset. It does not imply physical
colour equality or change the frozen ATLAS Clarus PKL image identity, A′ v0.4,
or 4C/ECG production-preview behaviour.
