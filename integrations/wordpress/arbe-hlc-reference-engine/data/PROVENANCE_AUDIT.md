# Runtime master provenance and redistribution audit (candidate)

Date: 2026-09-27. This is a factual inventory and release gate, not a licence grant or a published dataset release. The accompanying machine-readable file is `runtime-master-v1.candidate-manifest.json`. The CSV remains absent from GitHub.

## Observed chain

1. The user-supplied WordPress v0.1.5 ZIP dated 2026-07-13 includes `data/runtime-master-v1.csv` and `tools/export_runtime_master.py`.
2. The exporter names `atlas_master_frame_cxf_reconciled_v1.pkl` as its input and selects 14 columns: reference, Lab, display HEX/RGB, precomputed spectral descriptors, method, and identity flag.
3. The supplied CSV is 1,705,918 bytes, SHA-256 `9baa2cdfe75e3489fc94bc92377f5b0509f2f5688a279d92c1201559757f7fd4`. The local validator passes 13,283 unique references.
4. Existing repository metadata identifies freieFarbe e.V.'s HLC Colour Atlas XL v1.2 as the external reference foundation (CC BY-ND 4.0). The vendor package's original file-level hashes are registered under `data/vendor/hlc-colour-atlas-xl/v1.2/manifest.json`.
5. A separate internal master manifest names `atlas_master__active_master__v2_illumext.pkl`, SHA-256 `8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4`. This is **not** the same filename as the exporter's declared input. No hash or transformation log proves that they are the same source.
6. Staging and public WordPress report v0.1.6, `ready`, and 13,283 distinct database references. That count and tested example responses do not establish a database-wide digest equal to the supplied CSV.

## Rights finding

The freieFarbe package readme in `HelabHLC/arbe-lambda/docs/license_hlc_atlas.txt` names freieFarbe e.V. and CC BY-ND 4.0, with attribution required for copying the original package. The publisher lists the XL v1.2 package as a public download. Creative Commons' BY-ND summary permits sharing licensed material with attribution but restricts sharing adapted material. A 14-column export from an enriched internal master may implicate that restriction; whether any particular columns or transformations legally constitute adapted material requires a rights review or permission from the rights holder. The public repository's own release policy prohibits publishing derived libraries with unresolved or restrictive source terms.

This audit does not claim that use of the current WordPress deployment is legally cleared; it assesses the proposed public GitHub redistribution only. No CSV or original vendor dataset is included in this PR.

Sources:
- Publisher download listing: https://freiefarbe.de/en/thema-farbe/software/
- Publisher atlas description: https://freiefarbe.de/en/thema-farbe/hlc-colour-atlas/
- CC BY-ND 4.0 summary: https://creativecommons.org/licenses/by-nd/4.0/deed.de
- Repository release policy: https://github.com/HelabHLC/arbe-lambda/blob/main/docs/repository-roles-and-release-policy.md

## Release evidence still needed

- Locate and hash `atlas_master_frame_cxf_reconciled_v1.pkl`; record the exact exporter environment, transformation commands, and hashes of the original vendor components used.
- Produce a field-by-field source/computation map for the 14 columns, especially Lab/HEX/RGB versus ARBE-derived spectral descriptors. Reconcile the v1 input with the registered v2 internal master.
- Obtain written redistribution permission or a documented rights determination specifically covering the derived runtime CSV. Include attribution and licence notices for every retained vendor component.
- Export or deterministically fingerprint the actual WordPress table and compare its contents with the CSV; a row count alone is insufficient.
- After these gates pass, issue an approved manifest with explicit source versions, checksums, schema report, rights evidence and immutable tag/release. Keep the candidate manifest's blocked status until then.
