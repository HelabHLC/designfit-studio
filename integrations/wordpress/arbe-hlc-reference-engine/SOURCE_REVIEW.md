# ARBE HLC Reference Engine WordPress source review

**Status:** v0.1.6 candidate, source review only. This directory does not
contain the runtime CSV and cannot be packaged as an installable release.

The source is derived from the user-supplied v0.1.5 WordPress archive dated
13 July 2026. The public page uses `[arbe_hlc_reference_tool]`. A separate
v1.1.0 plugin registers `[arbe_hlc_reference_engine_v11]` and does not
implement this page.

This review repairs frontend evidence-field display, strict HLC/FP parsing,
Brent validation for exact lookups, and import failure/count handling. It
does not change the matching algorithm. HEX, RGB and Lab request matching
still uses CIEDE2000 D50/2° against the WordPress runtime master. That route
is distinct from the frozen ATLAS Clarus PKL image-pixel assignment based on
integer RGB squared distance and `atlas_row_id` tie-break.

The CSV's precomputed spectral descriptors are displayed, not recomputed by
this plugin. No physical measurement, production approval, A′ change, or
4C/ECG change is claimed.

Review gates before deployment:

1. PHP 8+ lint every PHP file and run the packaged CSV validator with an
   authorized local dataset.
2. Test exact HLC, FP, HEX/RGB/Lab, invalid inputs, WordPress REST and
   `admin-ajax.php` fallback against a staging database.
3. Confirm the active WordPress installation matches this supplied source,
   including PHP/JS and imported CSV digest.
4. Establish dataset provenance/licence and a release manifest before any
   public data release.
