# FP Platform reference pilot — H055_L060_C085

Status: **live pilot imported and verified on 2026-09-27**. The administrator-only importer registered one FP master row and 36 CXF-derived remission points after checking the runtime reference, CSV SHA-256, spectral grid and InnoDB tables.

## Verified source

The reconciled source Pickle has 13,283 unique and valid atlas identities. All rows declare a CXF-present, exactly reconciled 380–730 nm spectrum at 10 nm steps. The target is `H055_L060_C085`, `#EA6700`, RGB `(234, 103, 0)`, Lab `(60.0000, 48.7540, 69.6279)`. `prepare_fp_reference_pilot.py` emits the 36 atlas-remission points and SHA-256 manifest. The source CXF is `HLC-Colour-Atlas-XL_SpectralData_v1-2.cxf`. See the bundled freieFarbe attribution and licence notice. The source Pickle is not distributed.

## Live FP Platform 5.2.0 result

- Before the import, the FP master had two `demo_master` rows and no reference curve points. Twelve pigment candidates and 432 pigment curve points were present.
- The one-reference plugin was installed and activated on IONOS after user approval. Its import reported `Imported H055_L060_C085 and all 36 reviewed reference curve points.`; the admin page counted 36.
- The public page accepted the user's full `FP::H055_L060_C085::...` string, resolved `H055_L060_C085`, and displayed `Reference mode: measured_full_curve`. Test: https://arbe-lambda-star.com/arbe-fp-pigment-atlas/?fp_color=H055_L060_C085
- The best demo pigment showed only 1.78% similarity and `Different Structure`. No HLC candidate set was imported. The ranking and solver output are **not validated pigment recipes or production advice**.
- The live parser correction was separately made through the WordPress Plugin File Editor, not included in this PR. A future FP Platform plugin update could overwrite it.
- The separate `/wp-json/arbe/v1/diagnostics` endpoint reported `status: fail` before the import, while `/wp-json/arbe/v1/health` reported `status: ok`. Investigate diagnostics before a broader rollout.

The pilot importer is one-shot and may be deactivated after verification; imported FP data persists. Broader master import and validated pigment candidates require a separate design and review.

## Parser source recovery status (2026-09-30)

**Blocked: the live parser correction is not preserved as executable source.** The repository audit found no FP Platform parser source in the inspected reachable history. See [the source audit and one-time read-only handoff](PARSER_SOURCE_AUDIT.md) and [pinned evidence manifest](PARSER_SOURCE_AUDIT.json). The HLC Reference Engine parser is a different plugin; its code is not evidence of this live correction. The overwrite warning above remains unresolved.
