# 5.2.1-rc1 package acceptance — 2026-10-10

Result: **PACKAGE_AND_ISOLATED_WORDPRESS_PASS; SITE_STAGING_NOT_PERFORMED**.

Tested package SHA-256:
`07a91a2ffc51f1a24b5ad3a5fffb3da241f82c3cb9eaf22d4a062578cfb8c748`.

GitHub [run 38025965183](https://github.com/HelabHLC/designfit-studio/actions/runs/38025965183)
passed at source head `022185562a9fe0104e10f94ed16cde52f204a29f`.
The accompanying evidence files are exact JSON outputs extracted from the
workflow artifacts. [receipt.json](evidence/receipt.json) records artifact IDs,
downloaded ZIP SHA-256s and saved JSON hashes; expiring download credentials are
not stored.

| Real test environment | PHP 8.1.34 | PHP 8.5.11 |
| --- | --- | --- |
| WordPress version | 7.1.2 | 7.1.2 |
| MariaDB version | 10.11.19 | 10.11.19 |
| Native WordPress phase assertions | 313 PASS | 313 PASS |
| Anonymous HTTP requests | 19 PASS | 19 PASS |
| Protected reference/pigment/candidate tables | 8 unchanged | 8 unchanged |
| WordPress debug log | empty/absent | empty/absent |

The native phases exercise real core, SQL, parser, solver and rendering code:

1. Install the preserved 5.2.0 code with WordPress's ZIP installer and activate it.
2. Seed a clearly synthetic reference with 36 curve points and three synthetic
   pigments. Remove one original demo reference to detect accidental reseeding.
3. Record baseline solve/search numerics and hash all eight protected tables.
4. Replace the active plugin through `Plugin_Upgrader::install()` with overwrite
   enabled, as used for an uploaded replacement ZIP.
5. Load the new release in a fresh process; check schema/runtime options, actual
   REST dispatch, full-code/short-form resolution, malformed input errors,
   actual shortcode parsing and identical baseline numerics.
6. Deactivate/reactivate and confirm no schema change or demo reseeding.
7. Exercise the real public HTTP router anonymously: 9 accepted REST requests,
   4 rejected solve requests (including array input), and 6 rendered page requests.
8. Restore the original source in the fixture and confirm original behavior and
   unchanged protected data. Then test fresh RC activation on a new empty prefix.

The native runtime writes audit/certificate events only in the disposable fixture
database. Its master/protected-table guard is a test-only mu-plugin; it is not
shipped or installed on the user's site. These tests do not modify Atlas masters.

Additional checks passed in both CI environments:

- Original source receipt/inventory/hash verification and unchanged historical
  regression: 18 cases, 29 entry paths, 136 assertions.
- Shared input regression: 45 cases, 1,223 entry-path calls, 4,284 assertions.
- Same input regression against the PHP extracted from the release ZIP.
- Identical ZIP bytes across repeat builds; CI-generated ZIP equals the committed
  package; all packaged PHP passes syntax checks.

Local PHP 8.3.6 package/input checks also passed. Native WordPress acceptance ran
in GitHub's disposable MariaDB environment because the workspace did not permit
binding a local database socket. No production credentials were used.

## Limits and remaining production gate

The host reports PHP **8.5.9**; the 8.5 CI branch actually provided **8.5.11**.
These are recorded distinctly. Production's other plugins, GeneratePress
customizations, cache, and host configuration are not reproduced by the isolated
fixture. No manual browser/visual or site-specific staging acceptance is claimed.

The existing staging connection returned HTTP 403 for plugin inspection because
its connected account lacks `manage_options`. WPWriter's plugin inventory also
reported a connector error. Production remains on 5.2.0; no update, import,
live solve, plugin activation, or database mutation was performed there.

The concrete next step is administrator access for the existing staging site,
testing this exact ZIP with the actual site stack, and a host-side plugin plus
database backup before production replacement. The prepared package and green
CI are complete; production deployment is not claimed.

FP address extraction continues to ignore the opaque payload. No payload
authentication or scientific validity of pigment recipes is established by
these software tests.
