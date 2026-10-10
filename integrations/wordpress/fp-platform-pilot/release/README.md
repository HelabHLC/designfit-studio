# ARBE FP Platform 5.2.1-rc1

An installable **release candidate**, built from the archived 5.2.0 source and
the input-normalization proposal in PR #96. It replaces the existing
`arbe-fp-structural-solver` plugin directory, retaining the exact plugin basename
`arbe-fp-structural-solver/arbe-fp-structural-solver.php`.

**Native WordPress acceptance passed** on PHP 8.1.34 and 8.5.11:
[run 38025965183](https://github.com/HelabHLC/designfit-studio/actions/runs/38025965183).
See [VALIDATION.md](VALIDATION.md) for the measured outcomes and remaining
site-specific staging boundary. The package has not been installed publicly.

The ZIP is [dist/arbe-fp-platform-5.2.1-rc1.zip](dist/arbe-fp-platform-5.2.1-rc1.zip).
Its SHA-256 is:

```text
07a91a2ffc51f1a24b5ad3a5fffb3da241f82c3cb9eaf22d4a062578cfb8c748
```

[SHA256SUMS.txt](dist/SHA256SUMS.txt) and
[package-manifest.json](dist/package-manifest.json) bind the ZIP and all 22
packaged files. ZIP entry order, timestamps, modes and uncompressed storage are
fixed; repeat builds produce identical bytes without depending on zlib.

## Behavior

The shared parser recognizes full FP-code headers and supported legacy short
forms consistently in spectral search, direct solve, solver/certificate
shortcodes and REST `/solve`. Invalid embedded/repeated FP markers are no longer
repaired through global string deletion. Address extraction still **does not
validate or authenticate the FP payload**. The original normalization proposal
documents the exact compatibility contract and offline test cases.

This package additionally updates the entry-file version and replaces the stale
1.4.0 release manifest. There are no changes to master files, database lookup,
spectral algorithms, optimization, certificates, CSS or JavaScript.

### Schema version remains 5.2.0

Simply increasing the old runtime-version constant would execute the existing
`plugins_loaded` migration, including table creation and demo reference seeding.
That is unnecessary for a parser-only update and could reintroduce demo rows
that an administrator had removed.

The small [release-entry.patch](release-entry.patch) therefore separates runtime
version `5.2.1-rc1` from schema revision `5.2.0`. Existing installations inherit
their stored 5.2.0 schema state; activation/reactivation uses the same upgrade
function. Only two WordPress options record runtime/schema revision. Updating
an existing 5.2.0 installation performs no schema work or demo seeding. A fresh
installation still initializes the plugin tables and its two original demo
references. Older schema paths remain inherited behavior, not a newly claimed
compatibility target. No original archived file is edited.

## Reproduce the package and checks

From the repository root:

```sh
python3 integrations/wordpress/fp-platform-pilot/input-normalization/test.py
python3 integrations/wordpress/fp-platform-pilot/release/test_release.py
python3 integrations/wordpress/fp-platform-pilot/release/build_release.py --output /tmp/fp-package-review
```

The first two commands accept `--php /path/to/php`. The new workflow
**FP Platform release candidate acceptance** runs PHP 8.1 and 8.5 branches and
records the actual patch version in its output. A requested setup-php patch
version was observed to select the latest 8.5 patch, so this workflow does not
mislabel it as the production host's exact PHP 8.5.9.

Native acceptance uses real WordPress **7.1.2**, pinned to official source commit
`160387b7312c9407c7fe4b1d3dd2055206749a34`, and an isolated MariaDB service.
It uses native `Plugin_Upgrader` ZIP installation/replacement, activation,
WordPress shortcode parsing and REST dispatch, plus anonymous requests through
the real HTTP router. No WordPress API/SQL/solver doubles are used in this test.

Every database value is a synthetic fixture. Tests compare actual numerical
outputs against a bare-address solve/search with the preserved 5.2.0 code.
They fingerprint eight reference/pigment/candidate tables before and after
upgrade, reactivation, functional calls and rollback. A mu-plugin in the test
site refuses writes to those tables during these phases. A deliberately removed
demo reference detects accidental reseeding. Fresh activation is tested with a
separate empty database prefix. Audit/certificate events created by exercising
the real plugin are confined to the test database.

Only the package, source patches and tests are shipped here. The guard and all
synthetic fixtures are **not** included in the installable ZIP.

## Deployment boundary

The package is ready for site-specific staging review only after its linked
native-acceptance workflow is green. The CI environment does not reproduce the
production site's other plugins, GeneratePress customizations, cache or hosting
configuration. It is not proof of payload validity or scientific recipe quality.

Read-only observations on 2026-10-10:

- Production `https://arbe-lambda-star.com`: ARBE FP Platform active at 5.2.0;
  WordPress 7.1.2; PHP 8.5.9; GeneratePress 3.6.1.
- WPWriter lists the site, but plugin inventory returns
  `Could not list plugins. Ensure the WPWriter connector plugin is up to date.`
  Its exposed installer supports WordPress.org slugs, not this custom ZIP.
- The existing `https://arbe-lambda-star.com/atlas-rc20-test` connection is limited.
  The read-only plugin query returned HTTP 403: missing `manage_options`.
  That connection was not removed, altered or bypassed.
- No WordPress plugin/theme/database changes, live solves, imports or public
  deployments were made. No production credentials are used by CI.

Before production installation, restore administrator access to the existing
staging connection and test this exact ZIP with the site's plugin stack. Obtain
a host-side backup of the current plugin directory and database; the archived
connector source views are not a complete raw-byte host backup. Then upload the
ZIP through **Plugins → Add New → Upload Plugin** and replace **ARBE FP Platform**.
Do not replace **ARBE FP One**, **FP Guardrail**, or the **H055 pilot importer**.
Do not rename the ZIP's plugin directory or rerun the pilot importer.

Rollback means restoring the backed-up plugin directory. The schema remains
5.2.0, and the test covers original-code rollback against the preserved data.
File rollback does not remove audit/certificate events generated by subsequent
searches/solves; those remain a separate data-history concern.

This branch is based on PR #96, which in turn depends on PR #95. Neither prior
PR is merged here. Retarget and rerun checks when the dependency chain is merged.
