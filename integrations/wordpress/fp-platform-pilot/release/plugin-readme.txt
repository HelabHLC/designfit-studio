=== ARBE FP Platform ===
Requires PHP: 8.1
Stable tag: 5.2.1-rc1

Release candidate: common reference-address recognition for spectral search,
direct solver inputs, shortcodes and REST /solve.

== Scope ==
Extracting a reference address does not validate or authenticate an FP payload.
The remainder of a full FP code is ignored. Reference membership is checked by
the existing database lookup. Pigment calculations and master data are unchanged.

== Installation ==
This ZIP replaces ONLY:
arbe-fp-structural-solver/arbe-fp-structural-solver.php
(plugin name: ARBE FP Platform; previously version 5.2.0).

The whole existing plugin directory is replaced by the ZIP with the same slug.
Do not install a second copy under a renamed directory. Do not replace ARBE FP
One, FP Guardrail or the H055 pilot importer with this package.

For an existing 5.2.0 installation, the schema remains at 5.2.0. Parser-only
updating or reactivation does not rerun table creation or seed demo colours.
A genuinely new installation still creates the plugin's tables and demo rows.

Before a production update, make a host-side backup of the existing plugin
directory and database, and complete site-specific staging acceptance. This
package is a release candidate, not automatic production approval. Upload the
ZIP under Plugins > Add New > Upload Plugin and replace the existing version.

== Rollback ==
Restore the host-side 5.2.0 plugin-directory backup if acceptance fails. This
release does not migrate the 5.2.0 schema or delete existing records. Any audit
or certificate entries from actual test searches/solves are separate new events;
file rollback alone does not remove those events. Do not rerun the pilot importer.

== Provenance ==
Built from the preserved 2026-10-09 source view in designfit-studio PR #95 and
the normalization proposal in PR #96. release-manifest.json contains exact
source commit references and per-file checksums. The archived capture is not
modified. Captured UTF-8/LF source views are not an attestation of raw server bytes.

== Changelog ==
= 5.2.1-rc1 =
Shared parser for reference input paths; safe array/object handling; preserve
legacy short forms; do not repair malformed embedded/repeated FP markers.
Separate schema revision from runtime version to avoid parser-update seeding.
Replace the stale 1.4.0 release manifest with current package metadata.
