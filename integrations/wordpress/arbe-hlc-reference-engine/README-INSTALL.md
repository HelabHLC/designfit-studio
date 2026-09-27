# ARBE HLC Reference Engine — WordPress + MySQL package

The package includes the checksum-locked `data/runtime-master-v1.csv`.
Before installing, read `data/RELEASE_NOTICE.md` for freieFarbe attribution,
licence terms and the description of ARBE additions. Verify the checksums
in `data/runtime-master-v1.release-manifest.json`.

This package installs a WordPress plugin that:

- creates the MySQL runtime table on activation
- imports a prepared atlas-only runtime master from CSV
- exposes a REST match endpoint at `/wp-json/arbe-hlc-reference/v1/match`
- renders a public request UI through the shortcode `[arbe_hlc_reference_tool]`

## Installation

1. In WordPress go to **Plugins → Add Plugin → Upload Plugin**.
2. Zip the `arbe-hlc-reference-engine` directory with its `data/` files and
   upload that ZIP; keep the plugin directory as the ZIP's single top-level
   folder.
3. Activate the plugin.
4. Open **ARBE HLC** in the WordPress admin menu.
5. Click **Run guided installation**.
6. Wait until the importer reaches `ready`.
7. Add the shortcode `[arbe_hlc_reference_tool]` to any page.

## What the installer does

- creates a MySQL table named `wp_arbe_hlc_master` (or your WordPress table prefix variant)
- imports only valid `Hxxx_Lxxx_Cxxx` rows with `lambda_v2_method = Brent`
- enables the match route and health route
- stores a compact runtime master in MySQL, not the original Python pickle

## Supported request types

- HEX
- RGB
- Lab
- HLC / FP block with embedded `Hxxx_Lxxx_Cxxx`

## REST routes

- `GET /wp-json/arbe-hlc-reference/v1/health`
- `POST /wp-json/arbe-hlc-reference/v1/match`

### Example match payload

```json
{
  "input_type": "hex",
  "value": "#EEBE53",
  "master_version": "active"
}
```

## Notes

- Inputs are treated as requests, not results.
- HEX/RGB and Lab requests use CIEDE2000 against the runtime Lab data. This is an ARBE Reference Engine request route, not the frozen PKL Workflow v3.4.0 RGB-only image-pixel assignment.
- HLC / FP requests require a complete canonical reference token at the start of the input; an arbitrary embedded HLC substring is rejected.
- The runtime CSV carries precomputed λ*_V2 values and the `Brent` method flag. This plugin does not recompute λ*_V2 from reflectance spectra.
- The packaged runtime CSV has 13,283 unique references and SHA-256 `9baa2cdfe75e3489fc94bc92377f5b0509f2f5688a279d92c1201559757f7fd4`. This is the CSV artifact digest, not the PKL Full Reference master digest.
- The plugin returns exactly one validated reference output.
- The packaged runtime CSV was prepared from the local master pickle for WordPress/MySQL import.
- The plugin keeps data on deactivation by design.


## v0.1.1 import resume hardening
- Installer resumes from stored offset instead of always restarting at 0.
- Default chunk size reduced to 200 for shared hosting such as IONOS.
- AJAX failure now surfaces the database or HTTP error message in the installer UI.


Version 0.1.2 adds request-context fields to the frontend reference card: customer_ref, request_id, requested_at, input_type, and input_value.

## v0.1.6 candidate
- Show the technical validation fields actually returned by the REST/AJAX result.
- Reject malformed HLC/FP input and require the Brent flag on exact lookups.
- Stop the guided import on invalid rows and require the final database row count to match the CSV.
- Run `python tools/validate_runtime_master.py` before packaging.
- No change to the frozen PKL pixel binding, A′ v0.4, or 4C/ECG paths.
- Dataset redistribution provenance and licence must be confirmed before the runtime CSV is pushed to a public GitHub repository.
- The included CSV was supplied with the existing installation. Its exact upstream component licences have not been audited in this candidate; keep this ZIP in the project review workflow until that is resolved.


## v0.1.5 note
This update adds a frontend fallback transport via `admin-ajax.php` for `/health` and `/match` when REST JSON is contaminated by injected script or markup from other plugins, themes, or snippets. Existing MySQL tables and imported rows are preserved.
