# Live FP Platform 5.2.0 source recovery — 2026-10-09

Status: **LIVE_SOURCE_VIEW_PRESERVED; HISTORICAL_5_2_0_DIFF_UNKNOWN**.
This is evidence of the current installed implementation, not a new plugin
release, an installable replacement package, or a reconstruction of the edit
made on 2026-09-27.

## Provenance and integrity boundary

- Site: `https://arbe-lambda-star.com`, WordPress plugin path
  `wp-content/plugins/arbe-fp-structural-solver/`.
- Authenticated, administrator-authorized, read-only WPVibe 1.20.3 source
  inspection. The plugin inventory reports **active, version 5.2.0**; the
  recovered header and version constant agree.
- All **20 files** in the scoped allowed-source inventory were read completely:
  the entry file, 16 include files, CSS, JavaScript and the release manifest.
  [capture.json](capture.json) preserves the inventory and numbered source
  responses; [MANIFEST.json](MANIFEST.json) records each path, retrieval time,
  exported byte length and SHA-256. [context.json](context.json) preserves the
  relevant plugin records, public page read and two adjacent plugin entry reads.
- [source/](source/) contains UTF-8 text reconstructed by removing only the
  provider's line-number/TAB prefix and joining returned lines with LF. No
  source fix, formatting cleanup or implicit final newline was introduced.
  The reconstruction can be checked against every numbered response.
- **These SHA-256 values cover the saved exports, not independently measured
  server-file bytes.** The connector can mask secret patterns, does not provide
  raw server hashes and exposes line-oriented text. No visible redaction marker
  was found, but absence of silent masking and original newline bytes cannot
  be attested. This is not an atomic filesystem snapshot. Hidden files, binary
  files and other extensions excluded by the provider are outside the inventory.
- [SHA256SUMS.txt](SHA256SUMS.txt) binds the source files, receipts, manifest and
  comparison. Git commit identity additionally binds the documentation/tests.
  A host-side read-only ZIP plus server SHA-256 hashes would close the remaining
  raw-byte backup gap; no backup plugin or export script was installed live.

## Actual public input path

The read of published page **4946**, slug `arbe-fp-pigment-atlas`, returned the
stored shortcode `[arbe_fp]` and matching empty-form rendered output. The two
similarly named active plugins inspected register `[arbe_fp_one]` and
`[arbe_fp_guardrail]`, respectively; neither entry file overrides `[arbe_fp]`.
This is source/page evidence, not a new full-code live execution or an audit of
every other plugin/theme/hook in the installation.

| Location in the preserved source | Operation |
| --- | --- |
| `includes/shortcodes.php:315–342` | Registers `[arbe_fp]`; default mode calls the unified platform renderer |
| `includes/shortcodes.php:345–379` | Parses GET `fp_color` or shortcode `color`; calls spectral-search renderer |
| `includes/spectral-search.php:4–9` | `arbe_fp_parse_color_query`: uppercase/trim/string conversion, leading `FP::Hddd_Lddd_Cddd` extraction with `::` or end boundary, then legacy `FP:` removal fallback |
| `includes/spectral-search.php:88–113` | Renderer parses the input and calls `arbe_fp_spectral_search` |
| `includes/spectral-search.php:11–18` | Search parses again and passes the resulting address to `arbe_fp_get_color` |
| `includes/database.php:185–191` | Uppercase/trim, then prepared equality lookup by `fp_color_id` |
| `includes/rest-api.php:108–116,373–387` | Registered REST spectral-search callback passes `color` into the same search function |

For `FP::H055_L060_C085::<opaque payload>`, this path binds
`H055_L060_C085` as the database lookup value. The tail is not validated or
authenticated by this parser; address recognition does not verify spectral
values, a signature, recipe or master membership.

The direct `arbe_fp_solve`, structural-solver shortcodes and REST `/solve`
follow a different path: they pass the full string to the lookup without the
spectral-search parser. The regression records this limitation rather than
claiming that all FP entry points recognize full codes. The separate
`arbe_hlc_acq_normalize_hlc` helper is not the public parser above.

## Comparison with existing repository evidence

Compared against PR head `b0299bcbdef4fdfc5720e0594dedbc320bfec2f9` and inspected
main `da0449e64c3ff18ea92c263ae46af27947191896`.
[COMPARISON.json](COMPARISON.json) contains all six file comparisons.

- The recovered entry-file export is **byte-identical to the previously supplied
  5.2.0 entry file**: SHA-256
  `7d4c6f6de5a1eb1cbd97e909cf609d6abeedb9228c2772a61071f853cc6a5c8a`.
- Each of the five previously saved 3.0.0 files differs from the current view.
  [legacy-v3-to-live.diff](legacy-v3-to-live.diff) is explicitly a **3.0.0 versus
  current-source comparison**, not the historical 5.2.0 correction.
- The old database lookup and the current database lookup both normalize and
  query the whole value. The newly recovered spectral-search path explains
  where the current public interface extracts the address.
- No matching untouched 5.2.0 parser baseline was available in the inspected
  repository evidence. The current bundled `release-manifest.json` labels
  itself **ARBE FP One Shortcode 1.4.0**; it has been preserved as observed and
  cannot establish an untouched 5.2.0 release.
- **The exact file edit/diff made on 2026-09-27 remains UNKNOWN.** Finding the
  current parser does not prove when or how it changed. The literal successful
  full input from that day is also not preserved in the supplied evidence.

## Reproduce verification

From the repository root, Python 3 and PHP 8.1+:

```sh
python3 integrations/wordpress/fp-platform-pilot/source-recovery/verify_live_capture.py
php integrations/wordpress/fp-platform-pilot/source-recovery/tests/fp_code_regression.php
```

The PHP harness loads the captured database, solver, spectral-search, shortcode
and REST modules directly. It checks 18 explicit input cases, 29 calls through
real entry points to the prepared lookup, and the empty public form (136
assertions). A database double stops at the SELECT boundary, before any database,
pigment computation, audit logging or certificate operation. WordPress hooks
are inert except the locally invoked REST registration. Test FP payloads are
explicitly synthetic; no historic input or measured values are fabricated.

The dedicated **FP Platform recovered source** GitHub Actions workflow checks
receipt reconstruction, hashes, PHP syntax and this regression. It has read-only
repository permission, no secrets and no deployment step. Local Python integrity
checks were run; PHP CLI was unavailable in the capture workspace, so executable
PHP results are provided by the workflow on the PR commit. See the PR's linked
workflow run for its actual outcome rather than treating this description as a
test-pass claim.

## Read-only scope

No live plugin/theme file was edited, installed, activated, updated or replaced.
No import, migration, repair, certificate registration or full-code live search
was requested. A live search/solve would call `arbe_fp_audit_log` and insert an
audit event, so regression execution is deliberately offline. Connector access
may itself be logged normally by WordPress/WPVibe.

The retained 2026-09-27 pilot result is historical evidence, not a fresh
validation of spectra or pigment formulas. Current-source preservation reduces
the risk of losing the parser implementation, but does not automatically make
future plugin upgrades preserve the live correction.
