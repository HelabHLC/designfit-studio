# FP reference-input normalization proposal

Status: **OFFLINE_REVIEW_CANDIDATE — NOT DEPLOYED — PAYLOAD NOT VALIDATED**.

The recovered 5.2.0 spectral-search path extracts an HLC reference address from
a full `FP::...` input, but direct solve paths currently look up the entire
string. This proposal gives search and solve the same reference-key parser,
including their shortcode and REST entry points. It changes no master data,
formulation algorithm, certificate schema or REST registration.

This is a separate, reproducible patch against the source view preserved in
[PR #95](https://github.com/HelabHLC/designfit-studio/pull/95), commit
`6ab35fc498591e2b06e952fa92224537348976b1`. That PR remains a separate dependency;
the proposal branch/PR is based on `codex/fp-platform-h055-pilot`, not merged into
`main`. The archived `source-recovery/live-2026-10-09` directory, its receipts,
and its historical regression are unchanged. No historical evidence is rewritten
to pretend that the live solve paths already supported full codes.

## Small runtime change

The [patch](fp-reference-input.patch) changes **three existing PHP files** and
adds **one 22-line helper** to a temporary copy:

| Candidate file | Change |
| --- | --- |
| `includes/color-query.php` | Shared `arbe_fp_parse_color_query()`; address/key extraction only |
| `includes/spectral-search.php` | Replace its local parser with `require_once`; skip the lookup for an empty key |
| `includes/solver.php` | Require the shared parser and normalize before lookup; skip the lookup for an empty key |
| `includes/shortcodes.php` | Require the parser and replace four direct uppercase/trim expressions with the same parser |

The function name and scalar string return type stay compatible with existing
callers. Both solver and search can load the helper independently, in either
order. No plugin entry-file/version edit is needed for this source proposal.
The database lookup is deliberately unchanged: imports and curve-writing
operations must not acquire new full-code interpretation implicitly.

## Input contract and compatibility

| Input example | Reference lookup key / result |
| --- | --- |
| `H055_L060_C085` | `H055_L060_C085` |
| Lowercase and surrounding ASCII whitespace | Uppercase, trimmed key, as before |
| `FP:H055_L060_C085` or `FP: H055_L060_C085` | `H055_L060_C085` |
| `FP::H055_L060_C085` | `H055_L060_C085` |
| `FP::H055_L060_C085::<opaque payload>` | `H055_L060_C085`; payload ignored |
| `FP::H055_L060_C085::` | Address recognized; empty payload is not validated |
| `custom-reference` or `FP:custom-reference` | `CUSTOM-REFERENCE`; keep literal legacy database keys |
| `FP::H999_L999_C999::X` | Extract `H999_L999_C999`; only the master lookup can establish membership |
| Wrong width, extra digit, missing full-code delimiter | Remain literal keys; never become the intended address |
| `FP:H055_L060_C085::X` | Legacy prefix stripped once; literal `H055_L060_C085::X`, not an extracted full code |
| Embedded/repeated `FP:` markers | Remain literal keys; no global deletion/repair |
| Empty/whitespace/null; arrays or objects | Empty key; no database lookup, no PHP cast/type error |

Existing scalar conversion remains for numbers/booleans. Scalar conversion is
not a claim that the input is a valid colour address. Empty direct search/solve
inputs use the existing `arbe_color_not_found` / HTTP 404 response; empty forms
retain their existing prompt/missing-ID rendering. Unknown nonempty keys still
go to the existing prepared equality lookup and retain its 404 error when absent.
No new HTTP status or response field is introduced.

**Intentional malformed-input change:** the old global `str_replace('FP:', '',
$q)` could turn `H055_FP:L060_C085` into a valid-looking address, or produce
different outcomes after repeated parsing. Only a leading, single legacy marker
is now removed, and nested markers are not repaired. These accidental repairs
are not retained as supported shorthand. Recognized full-code headers, ordinary
legacy short forms and literal database keys remain supported. The parser is
idempotent, so repeated calls along a renderer → search/solve chain do not change
the resolved key.

The existing nested `[arbe_fp mode="card"|"certificate"]` shortcode serializer
still HTML-escapes attribute values. Tests pin this existing behavior separately
for a quoted malformed literal key; it does not cause address recognition.

## Entry paths covered

- `arbe_fp_spectral_search()` and `arbe_fp_solve()` directly.
- Registered REST `/spectral-search`, `/solve`, and `/certificate` callbacks.
  `/certificate` delegates to `/solve`; no additional parser is added there.
- GET `fp_color` and `color` attributes for `[arbe_fp]`,
  `[arbe_spectral_search]`, `[arbe_fp_structural_solver]`,
  `[arbe_fp_solver_result]`, `[arbe_fp_solver_card]`, `[arbe_fp_certificate]`,
  and `[arbe_fp_certificate_json]`.
- The card/certificate modes of `[arbe_fp]`, including GET arrays.
- Existing GET-over-attribute precedence, explicit empty GET, and null fallback.

## Extraction is not payload validation

An extracted key only selects a stored reference row. It does **not** validate
the payload grammar, spectral values, a signature, provenance, recipe, numerical
H/L/C ranges, or master membership. A bad/empty/forged payload after a recognized
header therefore still resolves that address, by design and in line with the
existing public search behavior. Consumers must not describe this as “FP code
verified”. Full payload validation would need a separately specified format,
trust boundary and tests; it is not silently invented here.

All full-code fixtures in this proposal are synthetic. A successful solver test
uses a synthetic stored row and inert optimization/audit/certificate doubles:
the result and solver settings are identical for a bare address and different
opaque payloads. This establishes that incoming payload fields do not replace
stored master fields. It does not validate a pigment formula or certificate.
Production solve still has its existing audit/certificate behavior, which is
why no live search or solve is executed as part of these checks.

## Reproduce

From the repository root, with Python 3, PHP 8.1+ and GNU `patch`:

```sh
python3 integrations/wordpress/fp-platform-pilot/input-normalization/test.py
```

An explicit PHP CLI path can be passed with `--php /path/to/php`. The runner:

1. Verifies the unchanged archived receipts, source, comparisons and SHA-256s.
2. Runs the original characterization: 18 cases, 29 entry paths, 136 assertions.
3. Checks the entire archived capture and patch against `manifest.json`, copies
   source to a fresh external temporary directory, and applies with zero fuzz.
4. Verifies every candidate file hash and the exact four-file change boundary.
5. Lints 19 PHP files, checks both module load orders, and runs the new tests.
6. Removes the temporary candidate and rechecks the archive.

For manual code review of an uninstalled candidate (output must not exist and
must be outside the repository):

```sh
python3 integrations/wordpress/fp-platform-pilot/input-normalization/build_candidate.py \
  --output /tmp/arbe-fp-input-review
```

The [manifest](manifest.json) pins all 20 baseline source views, the complete
archived capture, the patch, and all 21 candidate source files. These hashes
cover the saved exports, not independently attested WordPress server bytes;
the source-recovery report's integrity boundary still applies.

## Validation and release boundary

Local execution on **PHP 8.3.6** passed: **45 input cases, 1,223 entry-path calls,
4,284 assertions**, in addition to the unchanged original regression. Warnings
and notices are treated as failures. Malformed/unknown/empty inputs also execute
real error returns and rendering, not just a simulated successful SELECT.

The separate **FP Platform reference input proposal** GitHub workflow runs the
same command with read-only repository permissions, no secrets and no deployment.
Its run result must be checked on the proposed commit; local success alone is
not a GitHub-CI success claim.

WordPress hooks, REST requests and shortcode dispatch are offline doubles.
No real WordPress HTTP/router/browser acceptance or live PHP 8.5.9 test has been
performed. The exact historical full FP input remains unavailable. Scientific
solver behavior, database contents and payload authenticity are outside this
input-path regression.

This is **not an installable replacement release**. The old bundled release
manifest and version remain untouched in the temporary source copy. A future
release needs packaging/version metadata, review of integration with the actual
WordPress environment, and an authorized staging acceptance before deployment.
Nothing in this branch installs, activates, imports, merges or deploys the patch.
