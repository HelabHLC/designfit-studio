# FP Platform live parser source audit — PR #95

Audit date: 2026-09-30. **Status: BLOCKED_MISSING_SOURCE_DIFF.**
The live parser correction has **not** been recovered or preserved as executable source.
This audit records the evidence gap; it is not a parser patch or a release approval.
No WordPress installation, file edit, activation, import or update was performed.

## Pinned scope

- Repository: [HelabHLC/designfit-studio](https://github.com/HelabHLC/designfit-studio).
- [PR #95](https://github.com/HelabHLC/designfit-studio/pull/95), open/unmerged at audit time.
- Base/main: `da0449e64c3ff18ea92c263ae46af27947191896`.
- Original pilot head: `d924016bc9a7b2c75f41fc73ff98818da2410ef4`.
- Original head tree: `fa4c7a2f95ad9b677dea06c6fa12e79705165843`.
- Original PR: 8 commits, 7 changed files, all additions.
- A full clone's fetched branches and tag were inspected: 666 reachable commits and 367 distinct historical paths. See [PARSER_SOURCE_AUDIT.json](PARSER_SOURCE_AUDIT.json) for the exact ref tips and changed-file list. This scope does not establish absence from deleted/unreachable commits, other repositories, or external archives.

The seven original changes contain the pilot importer, two READMEs, its manifest,
36-point CSV, release notice and preparation utility. There is no FP Platform
parser source, parser diff or parser regression fixture among them.
The PR conversation contains no comments supplying a missing diff.

## What the live evidence establishes

Commit `d924016bc9a7b2c75f41fc73ff98818da2410ef4` and the pilot README
report that, on 2026-09-27, FP Platform 5.2.0 accepted the user's complete
`FP::H055_L060_C085::...` input, resolved `H055_L060_C085`, and displayed
`Reference mode: measured_full_curve` after importing 36 CXF-derived points.
They explicitly say the parser correction was made separately in the WordPress
Plugin File Editor and is not in this PR.

That is a recorded runtime result, not evidence of the implementation diff.
The ellipsis is a placeholder: the literal full input was not retained in these
sources. The published URL
`https://arbe-lambda-star.com/arbe-fp-pigment-atlas/?fp_color=H055_L060_C085`
contains a bare ID and does not reproduce the full FP-string parser case.

The 12 demo/unvalidated candidates and 1.78% similarity do not establish a usable
pigment recipe. The earlier diagnostic failure remains a separate unresolved item.

## Responsible component and missing file

[Issue #4](https://github.com/HelabHLC/designfit-studio/issues/4) identifies the
legacy **ARBE FP Platform**, plugin directory `arbe-fp-structural-solver`,
version **5.2.0**, with 36 files in an external `uploads.zip` archive.
It names `includes/formula-engine.php` for formula extraction, **not** as the
FP-input parser. The archive and this plugin's PHP sources are not tracked in
the inspected history. The issue comments do not identify the parser file.

The responsible live plugin directory is therefore identified; the exact
parser-relative filename, function, call sites and edited lines are **unknown**.
A filename such as `includes/parser.php` must not be guessed. The repository's
legacy CGATS review concerns a different plugin, `arbe-lambda-spectral-atlas`.

The similar tracked parser is:
`integrations/wordpress/arbe-hlc-reference-engine/includes/class-arbe-hlc-matcher.php`,
private method `ARBE_HLC_Matcher::extract_reference` (original head lines 226–239).
It belongs to the **HLC Reference Engine**, not FP Platform.

At the audited head it has Git blob `c64702c89a0d07224f1b0288e088586a8e88f960`
and SHA-256 `fdd5630898e5554eb4cc7b8adb49d2dfc0b418bc60542c647e66bf2d7ff339fc`.
Its history contains commits `b7789a5a0fe20c37c69f9972be648afde2255fed`
and `ea91934745f566468b73bdf05081ebc5f9886b35`; both already contain the
anchored `FP::` extraction and `FP1|ID=` form. The standalone test
`integrations/wordpress/arbe-hlc-reference-engine/tests/importer_and_parser.php`
checks FP prefix extraction and rejection of embedded references/suffixed bare IDs.
These sources establish another plugin's behavior only. Copying its regex into an
unseen FP Platform function cannot establish the live fix or preserve unknown
return types, metadata handling, validation and callers.

## Precisely missing code difference

The missing artifact is the original-to-live diff for the FP Platform 5.2.0
file(s) changed in the Plugin File Editor on 2026-09-27:

1. Exact plugin-relative filename(s) and original bytes before the intervention.
2. Corrected live bytes, including the entire affected function and any changed
   caller/helper, not just an isolated regex.
3. Plugin header/version and provenance of the baseline used for the diff.
4. Literal tested full FP input and expected extracted ID; the README abbreviation
   is insufficient as a regression fixture.

No reliable original function, replacement function or patch hunk can be derived
from the repository, its reachable history, the issue/PR discussions, or the
retrieved prior context. No speculative executable patch is included.

## One-time read-only handoff

Obtain **one source-recovery bundle** from the live installation:

- A read-only ZIP/download of `wp-content/plugins/arbe-fp-structural-solver/`
  with paths preserved and the plugin entry file/header included. If the edited
  file is already known, its complete contents plus referenced parser helpers and
  callers and the entry-file header can replace the complete plugin ZIP.
- The corresponding untouched 5.2.0 release source, pre-edit backup, or explicit
  saved before/after diff for the edited file(s). The earlier `uploads.zip`
  may supply the baseline only after its plugin/version and file contents are
  checked. A matching version label alone does not prove identical source.
- The literal full FP string used in the successful H055 test.

If no pre-edit bytes can be recovered, the live export can still be archived with
checksums, but an exact original-to-live correction cannot be claimed. A newly
specified parser change would then need its own review and must not be described
as recovery of the 2026-09-27 patch.

This handoff requires reading/downloading only. Do not click Update File,
install or replace a plugin, activate an importer, or repeat the data import.

## Reproduce the repository audit

Run in a full clone with the manifest's objects available:

```sh
git diff --name-status da0449e64c3ff18ea92c263ae46af27947191896...d924016bc9a7b2c75f41fc73ff98818da2410ef4
git ls-tree -r --name-only d924016bc9a7b2c75f41fc73ff98818da2410ef4
git log --all --format= --name-only | sort -u
git log --all --oneline -S 'FP::' -- .
git log --all -p -- integrations/wordpress/arbe-hlc-reference-engine/includes/class-arbe-hlc-matcher.php
git show d924016bc9a7b2c75f41fc73ff98818da2410ef4:integrations/wordpress/arbe-hlc-reference-engine/includes/class-arbe-hlc-matcher.php
```

For the frozen history scope (future branch changes must not expand the count),
use the manifest's ref-tip SHAs rather than current `--all`:

```sh
python3 - <<'PY'
import json, subprocess
from pathlib import Path
manifest = json.loads(Path('integrations/wordpress/fp-platform-pilot/PARSER_SOURCE_AUDIT.json').read_text())
tips = sorted({ref['sha'] for ref in manifest['refs']})
print(subprocess.check_output(['git', 'rev-list', '--count', *tips], text=True).strip())
paths = sorted(set(subprocess.check_output(
    ['git', 'log', '--format=', '--name-only', *tips], text=True).splitlines()) - {''})
print(len(paths))
print('\n'.join(p for p in paths if 'arbe-fp-structural-solver' in p or p.endswith('uploads.zip')))
PY
```

Expected: 666 commits, 367 paths, no FP Platform source/archive paths.
A missing Git object is an incomplete reproduction, not a passing absence check.
If a recorded tip is no longer available in a future clone, obtain that object
from an archive/full clone before reproducing the history check.

## Completion criteria after source recovery

- Archive baseline and live files with their relative paths, SHA-256 values and
  source/version provenance; exclude credentials and unrelated site exports.
- Identify the actual parser and preserve the smallest justified diff in version
  control; include changed helpers/callers only when the diff proves necessity.
- Add regression checks through that parser's real input path: bare H055 ID,
  exact successful full FP string, other already-supported forms, malformed input,
  embedded unrelated text and conflicting identities. Specify expected behavior
  from recovered code/contracts before changing acceptance rules.
- Verify that lookup still resolves the stored H055 reference and that parser
  changes do not modify spectral values, recipe logic or evidence status.
- Run PHP lint and relevant isolated tests before preparing any later update.
  No FP Platform parser tests were run in this audit: its source is absent.
  PHP CLI is also unavailable in the audit environment.
- Update the pilot warning only once the live correction is actually preserved
  and tested. This audit document alone does not close the overwrite risk.

