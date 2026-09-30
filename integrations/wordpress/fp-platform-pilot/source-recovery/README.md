# FP Platform source recovery — supplied source evidence

Received: 2026-09-30, after the initial [source audit](../PARSER_SOURCE_AUDIT.md).
Status: **PARTIAL_SOURCE_RECOVERY; EXACT_5_2_0_LIVE_PARSER_DIFF_STILL_MISSING**.
No speculative parser patch has been created.

## Supplied files and preservation

1. `arbe-fp-structural-solver.php`: plugin header **ARBE FP Platform**, version
   **5.2.0**, requires PHP **8.1**, constant `ARBE_FP_SOLVER_VERSION = 5.2.0`.
   SHA-256: `7d4c6f6de5a1eb1cbd97e909cf609d6abeedb9228c2772a61071f853cc6a5c8a`.
   The adjacent file is preserved byte-for-byte. It is the plugin entry file and
   contains no FP parser implementation. It loads 16 files from `includes/`.
2. `arbe-fp-structural-solver-v3.0(1).zip`: the contained entry file declares
   **ARBE FP Structural Solver 3.0.0**, matching its version constant; this is
   genuinely older source, not a 5.2.0 package with an old filename.
   ZIP SHA-256: `996580c3f0f750be8fd52ceaa2fd91f8b49583a5a1fcc633ac491ad92dec9112`.
   It has 18 ZIP entries (16 files, 2 directories). Five relevant source files
   are preserved unchanged under `legacy-v3.0.0/`: entry file, shortcodes, solver,
   database and REST API. All 16 archive files are inventoried with their hashes
   in [SOURCE_RECEIPT.json](SOURCE_RECEIPT.json).

These files are evidence snapshots, **not a complete installable replacement**.
The attachments' live/pre-edit provenance was not independently verified. An
entry-file version label cannot establish the contents of the missing dependencies.
No attachment PHP was executed. No live site or plugin files were read or changed.

## Verified legacy input path (3.0.0 only)

| File | Function / location | Observed operation |
| --- | --- | --- |
| `legacy-v3.0.0/includes/shortcodes.php` | `arbe_fp_structural_solver_shortcode`, lines 18 and 40 | Uppercase/trim GET `fp_color` or shortcode `color`; pass it to `arbe_fp_solve` |
| `legacy-v3.0.0/includes/solver.php` | `arbe_fp_solve`, lines 4–7 | Pass ID unchanged to `arbe_fp_get_color`; return `arbe_color_not_found` if no row |
| `legacy-v3.0.0/includes/database.php` | `arbe_fp_get_color`, lines 166–172 | Uppercase/trim the full value and use it as a prepared equality lookup for `fp_color_id` |

The legacy lookup is:

```php
function arbe_fp_get_color($fp_color_id) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arbe_fp_color_master WHERE fp_color_id=%s",
        strtoupper(trim($fp_color_id))
    ));
}
```

Static inspection of all PHP files in the supplied ZIP finds no `FP::` extraction.
For the public shortcode path above, a complete `FP::H055_L060_C085::...` string
would therefore be queried as the entire string, not as `H055_L060_C085`.
This describes the supplied 3.0.0 code; it is not a runtime test and does not
establish 5.2.0 behavior, nor claim that this older package contains H055 data.

## What this narrows down, and what it cannot prove

The same `includes/shortcodes.php`, `includes/solver.php`,
`includes/database.php` and `includes/rest-api.php` names are loaded by the
supplied 5.2.0 entry file. They are concrete inspection targets for the live
input path. Their 5.2.0 implementations were not supplied; additional 5.2.0
modules include `spectral-search.php` and `hlc-acquisition.php`.

The legacy normalization/lookup owner is now identified as
`includes/database.php::arbe_fp_get_color`. **The file/function edited in the
5.2.0 Plugin File Editor is still unknown.** It may be at a caller, a shared
normalizer, or another module; the older source cannot establish that fact.

Changing this 3.0.0 lookup or transplanting the separate HLC parser would create
a new proposed change, not reconstruct the recorded 2026-09-27 live correction.
There is still no justified smallest live patch because the corrected function,
its 5.2.0 baseline, callers and return contract are absent.

## Remaining one-time read-only handoff

Supply a read-only ZIP/download of the **current 5.2.0**
`wp-content/plugins/arbe-fp-structural-solver/` folder with paths preserved.
If the edited file is known, its complete corrected contents plus any parser
helpers/callers can replace a full ZIP. The entry/header need not be supplied again.
For incremental inspection, start with the current `includes/shortcodes.php`,
`includes/database.php` and `includes/solver.php`; follow the actual dependencies
from there rather than assuming the 3.0.0 path is unchanged.

To recover the exact historical diff also supply the untouched **5.2.0** release
or a pre-edit backup/diff, plus the literal successful full FP input. The 3.0.0
ZIP is a historical comparison, **not the matching 5.2.0 baseline**. Without
pre-edit bytes a checksummed live snapshot can be preserved, but the exact
original-to-live correction cannot be claimed.

## Verification and scope

- Attachment and selected file hashes were calculated; extracted bytes match
  the original ZIP entries exactly. No original code was changed.
- Plugin version declarations and the legacy call path were inspected as text.
- No PHP lint/runtime test was run: PHP CLI is unavailable in this environment.
- The initial `PARSER_SOURCE_AUDIT.json` remains a frozen record of the pre-upload
  repository scope; this receipt documents the subsequently supplied evidence.
- WordPress was not modified; no plugin or importer was installed, activated,
  updated or executed. The live parser overwrite risk remains unresolved.
