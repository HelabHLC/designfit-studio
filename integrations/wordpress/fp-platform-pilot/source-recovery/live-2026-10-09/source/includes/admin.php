<?php
if (!defined('ABSPATH')) { exit; }

add_action('admin_menu', function() {
    add_menu_page('ARBE FP Platform', 'ARBE FP Platform', 'manage_options', 'arbe-fp-solver', 'arbe_fp_solver_admin_page', 'dashicons-chart-area', 58);
    add_submenu_page('arbe-fp-solver', 'Dashboard', 'Dashboard', 'manage_options', 'arbe-fp-solver', 'arbe_fp_solver_admin_page');
    add_submenu_page('arbe-fp-solver', 'CSV Import', 'CSV Import', 'manage_options', 'arbe-fp-import', 'arbe_fp_solver_import_page');
    add_submenu_page('arbe-fp-solver', 'HLC Acquisition', 'HLC Acquisition', 'manage_options', 'arbe-fp-hlc-acquisition', 'arbe_fp_hlc_acquisition_page');
    add_submenu_page('arbe-fp-solver', 'Diagnostics', 'Diagnostics', 'manage_options', 'arbe-fp-diagnostics', 'arbe_fp_solver_diagnostics_page');
});

function arbe_fp_solver_admin_page() {
    if (!current_user_can('manage_options')) return;
    $message = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['arbe_repair_db']) && check_admin_referer('arbe_repair_db')) {
            arbe_fp_solver_create_tables();
            arbe_fp_solver_seed_color_master();
            update_option('arbe_fp_platform_version', ARBE_FP_SOLVER_VERSION);
            $message = '<div class="notice notice-success"><p>Database repair / migration completed.</p></div>';
        }
        if (isset($_POST['arbe_seed_demo']) && check_admin_referer('arbe_seed_demo')) {
            arbe_fp_seed_demo_pigments();
            $message = '<div class="notice notice-success"><p>Demo pigment library seeded. Demo curves are synthetic and not validated.</p></div>';
        }
        if (isset($_POST['arbe_import_csv']) && check_admin_referer('arbe_import_csv')) {
            if (!empty($_FILES['csv']['tmp_name'])) $message = arbe_fp_render_import_report(arbe_fp_import_pigment_csv_validated($_FILES['csv']['tmp_name']));
            else $message = '<div class="notice notice-error"><p>No CSV selected.</p></div>';
        }
        if (isset($_POST['arbe_import_ref_csv']) && check_admin_referer('arbe_import_ref_csv')) {
            if (!empty($_FILES['ref_csv']['tmp_name'])) $message = arbe_fp_render_import_report(arbe_fp_import_reference_curve_csv_validated($_FILES['ref_csv']['tmp_name']));
            else $message = '<div class="notice notice-error"><p>No reference CSV selected.</p></div>';
        }
    }

    $counts = arbe_fp_solver_counts();
    echo '<div class="wrap"><h1>ARBE FP One Shortcode v1.4</h1>';
    echo $message;
    echo '<h2>Status</h2>';
    echo '<ul><li>FP-Colors: <strong>'.intval($counts['colors']).'</strong></li><li>FP-Pigments: <strong>'.intval($counts['pigments']).'</strong></li><li>Pigment curve points: <strong>'.intval($counts['curves']).'</strong></li><li>Reference curve points: <strong>'.intval($counts['reference_curve_points']).'</strong></li><li>Certificates: <strong>'.intval($counts['certificates']).'</strong></li><li>Audit events: <strong>'.intval($counts['audit_events']).'</strong></li></ul>';

    $diag = arbe_fp_platform_diagnostics();
    echo '<p><a class="button button-primary" href="' . esc_url(admin_url('admin.php?page=arbe-fp-import')) . '">Open CSV Import</a></p>';

    echo '<h2>Diagnostics</h2>';
    echo '<p>Status: <strong>' . esc_html(strtoupper($diag['status'])) . '</strong></p>';
    echo '<ul>';
    foreach ($diag['recommendations'] as $rec) echo '<li>' . esc_html($rec) . '</li>';
    echo '</ul>';
    echo '<form method="post">';
    wp_nonce_field('arbe_repair_db');
    echo '<input type="hidden" name="arbe_repair_db" value="1">';
    submit_button('Repair / Run Database Migration', 'secondary');
    echo '</form>';

    echo '<h2>Recent Audit Events</h2>';
    $events = arbe_fp_audit_recent(10);
    if (!$events) { echo '<p>No audit events yet.</p>'; }
    else {
        echo '<table class="widefat striped"><thead><tr><th>Time</th><th>Event</th><th>Object</th><th>FP-Color</th></tr></thead><tbody>';
        foreach ($events as $e) echo '<tr><td>'.esc_html($e->created_at).'</td><td>'.esc_html($e->event_type).'</td><td>'.esc_html($e->object_id).'</td><td>'.esc_html($e->fp_color_id).'</td></tr>';
        echo '</tbody></table>';
    }

    echo '<h2>Smoke Test</h2>';
    echo '<p>Nach dem Seeden der Demo Library sollte der Smoke Test PASS liefern.</p>';
    echo '<p><code>/wp-json/arbe/v1/smoke-test</code><br><code>/wp-json/arbe/v1/audit</code></p>';

    echo '<h2>Demo Library</h2><form method="post">';
    wp_nonce_field('arbe_seed_demo');
    echo '<input type="hidden" name="arbe_seed_demo" value="1">';
    submit_button('Seed Demo Pigment Library');
    echo '</form>';

    echo '<h2>Import Pigment Curves CSV</h2>';
    echo '<p>Format: <code>pigment_code,pigment_name,pigment_family,source_id,wavelength_nm,remission</code></p><p>v4.6 validates wavelength 300–900 nm, remission 0–1 or 0–100%, duplicate points and row errors.</p>';
    echo '<form method="post" enctype="multipart/form-data">';
    wp_nonce_field('arbe_import_csv');
    echo '<input type="hidden" name="arbe_import_csv" value="1">';
    echo '<input type="file" name="csv" accept=".csv" required> ';
    submit_button('Import CSV', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>Import Measured FP-Color Reference Curves CSV</h2>';
    echo '<p>Format: <code>fp_color_id,wavelength_nm,remission</code></p><p>v4.6 validates FP-Color existence, wavelength 300–900 nm and duplicate points.</p>';
    echo '<form method="post" enctype="multipart/form-data">';
    wp_nonce_field('arbe_import_ref_csv');
    echo '<input type="hidden" name="arbe_import_ref_csv" value="1">';
    echo '<input type="file" name="ref_csv" accept=".csv" required> ';
    submit_button('Import Reference Curves', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>Shortcodes</h2><p><code>[arbe_fp]</code> <strong>recommended</strong></p><p><code>[arbe_fp color="H095_L090_C105"]</code></p><p><code>[arbe_spectral_search color="H095_L090_C105"]</code></p><p><code>[arbe_fp_structural_solver color="H095_L090_C105"]</code></p><p><code>[arbe_fp_solver_card color="H095_L090_C105"]</code></p><p><code>[arbe_fp_certificate color="H095_L090_C105"]</code></p><p><code>[arbe_fp_certificate_json color="H095_L090_C105"]</code></p><p><code>[arbe_fp_verify_certificate id="ARBE-FP-..."]</code></p><p><code>[arbe_fp_registry_lookup]</code></p>';
    echo '<h2>REST API</h2><code>/wp-json/arbe/v1/solve?color=H095_L090_C105&adaptive=1&kernel=km</code><br><code>/wp-json/arbe/v1/certificate?color=H095_L090_C105</code><br><code>/wp-json/arbe/v1/verify?id=ARBE-FP-...</code><br><code>/wp-json/arbe/v1/certificate-json?id=ARBE-FP-...</code><br><code>/wp-json/arbe/v1/certificate-csv?id=ARBE-FP-...</code><br><code>/wp-json/arbe/v1/certificate-print?id=ARBE-FP-...</code><br><code>/wp-json/arbe/v1/health</code><br><code>/wp-json/arbe/v1/selftest</code><br><code>/wp-json/arbe/v1/diagnostics</code><br><code>/wp-json/arbe/v1/smoke-test</code><br><code>/wp-json/arbe/v1/audit</code>';
    echo '</div>';
}


function arbe_fp_solver_import_page() {
    if (!current_user_can('manage_options')) return;
    $message = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['arbe_import_csv']) && check_admin_referer('arbe_import_csv')) {
            if (!empty($_FILES['csv']['tmp_name'])) {
                $message = arbe_fp_render_import_report(arbe_fp_import_pigment_csv_validated($_FILES['csv']['tmp_name']));
            } else {
                $message = '<div class="notice notice-error"><p>No CSV selected.</p></div>';
            }
        }

        if (isset($_POST['arbe_import_ref_csv']) && check_admin_referer('arbe_import_ref_csv')) {
            if (!empty($_FILES['ref_csv']['tmp_name'])) {
                $message = arbe_fp_render_import_report(arbe_fp_import_reference_curve_csv_validated($_FILES['ref_csv']['tmp_name']));
            } else {
                $message = '<div class="notice notice-error"><p>No reference CSV selected.</p></div>';
            }
        }
    }

    echo '<div class="wrap"><h1>ARBE FP One Shortcode v1.4 — CSV Import</h1>';
    echo $message;

    echo '<div class="notice notice-info"><p><strong>Hier ist der zentrale Importbereich.</strong> Nutze diese Seite für Pigmentkurven und gemessene FP-Color-Referenzkurven.</p></div>';

    echo '<h2>1. Import Pigment Curves CSV</h2>';
    echo '<p>Pflichtspalten:</p>';
    echo '<p><code>pigment_code,pigment_name,pigment_family,source_id,wavelength_nm,remission</code></p>';
    echo '<p>Remission akzeptiert <code>0–1</code> oder <code>0–100%</code>. Wellenlänge: <code>300–900 nm</code>.</p>';
    echo '<p><strong>Beispiel im Plugin-ZIP:</strong> <code>sample_pigment_curves.csv</code></p>';
    echo '<p><em>Hinweis:</em> „No file chosen“ bedeutet nur, dass noch keine lokale CSV-Datei ausgewählt wurde.</p>';
    echo '<form method="post" enctype="multipart/form-data" style="padding:16px;background:#fff;border:1px solid #ccd0d4;max-width:900px;">';
    wp_nonce_field('arbe_import_csv');
    echo '<input type="hidden" name="arbe_import_csv" value="1">';
    echo '<input type="file" name="csv" accept=".csv" required> ';
    submit_button('Import Pigment Curves CSV', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>2. Import Measured FP-Color Reference Curves CSV</h2>';
    echo '<p>Pflichtspalten:</p>';
    echo '<p><code>fp_color_id,wavelength_nm,remission</code></p>';
    echo '<p>Hinweis: <code>fp_color_id</code> muss bereits im FP-Color Master existieren.</p>';
    echo '<p><strong>Beispiel im Plugin-ZIP:</strong> <code>sample_reference_curves.csv</code></p>';
    echo '<p><em>Hinweis:</em> „No file chosen“ bedeutet nur, dass noch keine lokale CSV-Datei ausgewählt wurde.</p>';
    echo '<form method="post" enctype="multipart/form-data" style="padding:16px;background:#fff;border:1px solid #ccd0d4;max-width:900px;">';
    wp_nonce_field('arbe_import_ref_csv');
    echo '<input type="hidden" name="arbe_import_ref_csv" value="1">';
    echo '<input type="file" name="ref_csv" accept=".csv" required> ';
    submit_button('Import Reference Curves CSV', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>Beispiel-Dateien</h2>';
    echo '<p>Im Plugin-ZIP enthalten:</p>';
    echo '<ul><li><code>sample_pigment_curves.csv</code></li><li><code>sample_reference_curves.csv</code></li></ul>';
    echo '<h3>Mini-Beispiel Pigment CSV</h3>';
    echo '<pre style="background:#fff;border:1px solid #ccd0d4;padding:12px;max-width:900px;overflow:auto;">pigment_code,pigment_name,pigment_family,source_id,wavelength_nm,remission
PY150,Nickel Azo Yellow,yellow,DEMO,380,0.078
PY150,Nickel Azo Yellow,yellow,DEMO,390,0.080
PY150,Nickel Azo Yellow,yellow,DEMO,400,0.081</pre>';
    echo '<h3>Mini-Beispiel Reference CSV</h3>';
    echo '<pre style="background:#fff;border:1px solid #ccd0d4;padding:12px;max-width:900px;overflow:auto;">fp_color_id,wavelength_nm,remission
H095_L090_C105,380,0.067
H095_L090_C105,390,0.067
H095_L090_C105,400,0.067</pre>';

    echo '</div>';
}

function arbe_fp_solver_diagnostics_page() {
    if (!current_user_can('manage_options')) return;
    $message = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['arbe_repair_db']) && check_admin_referer('arbe_repair_db')) {
            arbe_fp_solver_create_tables();
            arbe_fp_solver_seed_color_master();
            update_option('arbe_fp_platform_version', ARBE_FP_SOLVER_VERSION);
            $message = '<div class="notice notice-success"><p>Database repair / migration completed.</p></div>';
        }
    }

    $diag = arbe_fp_platform_diagnostics();
    echo '<div class="wrap"><h1>ARBE FP One Shortcode v1.4 — Diagnostics</h1>';
    echo $message;
    echo '<h2>Status</h2><p><strong>' . esc_html(strtoupper($diag['status'])) . '</strong></p>';
    echo '<h2>Recommendations</h2><ul>';
    foreach ($diag['recommendations'] as $rec) echo '<li>' . esc_html($rec) . '</li>';
    echo '</ul>';

    echo '<h2>Repair</h2><form method="post">';
    wp_nonce_field('arbe_repair_db');
    echo '<input type="hidden" name="arbe_repair_db" value="1">';
    submit_button('Repair / Run Database Migration', 'secondary');
    echo '</form>';

    echo '<h2>Self Test</h2>';
    echo '<p><code>/wp-json/arbe/v1/selftest</code></p>';
    echo '<p><code>/wp-json/arbe/v1/smoke-test</code></p>';
    echo '</div>';
}


function arbe_fp_import_pigment_csv($path) {
    $fh = fopen($path, 'r');
    if (!$fh) return '<div class="notice notice-error"><p>Could not open CSV.</p></div>';

    $header = array_map('trim', fgetcsv($fh));
    $required = ['pigment_code','wavelength_nm','remission'];
    foreach ($required as $r) {
        if (!in_array($r, $header, true)) {
            fclose($fh);
            return '<div class="notice notice-error"><p>Missing column: '.$r.'</p></div>';
        }
    }

    $grouped = [];
    while (($data = fgetcsv($fh)) !== false) {
        $row = [];
        foreach ($header as $i=>$h) $row[$h] = $data[$i] ?? '';

        $code = strtoupper(trim($row['pigment_code'] ?? ''));
        if (!$code) continue;

        if (!isset($grouped[$code])) {
            $grouped[$code] = [
                'pigment_code'=>$code,
                'pigment_name'=>trim($row['pigment_name'] ?? ''),
                'pigment_family'=>trim($row['pigment_family'] ?? ''),
                'source_id'=>trim($row['source_id'] ?? ''),
                'source_name'=>trim($row['source_name'] ?? ''),
                'source_url'=>trim($row['source_url'] ?? ''),
                'curve_status'=>trim($row['curve_status'] ?? 'imported'),
                'curve'=>[],
            ];
        }

        $wl = intval($row['wavelength_nm']);
        $r = arbe_fp_normalize_remission(floatval(str_replace(',', '.', $row['remission'])));
        if ($wl >= 300 && $wl <= 900) $grouped[$code]['curve'][$wl] = $r;
    }
    fclose($fh);

    $count=0;
    foreach ($grouped as $entry) {
        if (count($entry['curve']) >= 5) {
            arbe_fp_save_pigment_curve($entry);
            $count++;
        }
    }

    return '<div class="notice notice-success"><p>Imported/updated '.intval($count).' pigment curves.</p></div>';
}

function arbe_fp_import_reference_curve_csv($path) {
    $fh = fopen($path, 'r');
    if (!$fh) return '<div class="notice notice-error"><p>Could not open reference CSV.</p></div>';

    $header = array_map('trim', fgetcsv($fh));
    $required = ['fp_color_id','wavelength_nm','remission'];
    foreach ($required as $r) {
        if (!in_array($r, $header, true)) {
            fclose($fh);
            return '<div class="notice notice-error"><p>Missing column: '.$r.'</p></div>';
        }
    }

    $grouped = [];
    while (($data = fgetcsv($fh)) !== false) {
        $row = [];
        foreach ($header as $i=>$h) $row[$h] = $data[$i] ?? '';
        $id = strtoupper(trim($row['fp_color_id'] ?? ''));
        if (!$id) continue;
        if (!isset($grouped[$id])) $grouped[$id] = [];
        $wl = intval($row['wavelength_nm']);
        $r = arbe_fp_normalize_remission(floatval(str_replace(',', '.', $row['remission'])));
        if ($wl >= 300 && $wl <= 900) $grouped[$id][$wl] = $r;
    }
    fclose($fh);

    $count = 0;
    foreach ($grouped as $id=>$curve) {
        if (count($curve) >= 5 && arbe_fp_save_color_curve($id, $curve, 'measured')) $count++;
    }

    return '<div class="notice notice-success"><p>Imported measured reference curves for '.intval($count).' FP-Colors.</p></div>';
}


function arbe_fp_hlc_acquisition_page() {
    if (!current_user_can('manage_options')) return;
    $message = '';

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['arbe_hlc_import_materials']) && check_admin_referer('arbe_hlc_import_materials')) {
            if (!empty($_FILES['materials_csv']['tmp_name'])) {
                $message = arbe_hlc_acq_render_report(arbe_hlc_acq_import_material_candidates_csv($_FILES['materials_csv']['tmp_name']), 'Material candidates import');
            } else {
                $message = '<div class="notice notice-error"><p>No material candidates CSV selected.</p></div>';
            }
        }

        if (isset($_POST['arbe_hlc_import_pigments']) && check_admin_referer('arbe_hlc_import_pigments')) {
            if (!empty($_FILES['pigments_csv']['tmp_name'])) {
                $message = arbe_hlc_acq_render_report(arbe_hlc_acq_import_pigment_candidates_csv($_FILES['pigments_csv']['tmp_name']), 'Pigment candidates import');
            } else {
                $message = '<div class="notice notice-error"><p>No pigment candidates CSV selected.</p></div>';
            }
        }
    }

    $counts = arbe_hlc_acq_counts();
    $hlc_preview = isset($_GET['hlc_id']) ? arbe_hlc_acq_normalize_hlc($_GET['hlc_id']) : 'H085_L085_C085';
    $candidate_url = arbe_hlc_acq_url($hlc_preview);
    $recent = arbe_hlc_acq_recent_candidates('', 20);

    echo '<div class="wrap"><h1>ARBE HLC Acquisition</h1>';
    echo $message;

    echo '<div class="notice notice-info"><p><strong>Workflow:</strong> HLC-Code → ArtistPigments HLC URL → Material Candidates → Pigment Candidates → Formula Explorer.</p></div>';

    echo '<h2>HLC URL Generator</h2>';
    echo '<form method="get">';
    echo '<input type="hidden" name="page" value="arbe-fp-hlc-acquisition">';
    echo '<input name="hlc_id" value="'.esc_attr($hlc_preview).'" style="width:260px" placeholder="H085_L085_C085"> ';
    submit_button('Generate URL', 'secondary', 'submit', false);
    echo '</form>';
    echo '<p><strong>ArtistPigments HLC URL:</strong><br><a href="'.esc_url($candidate_url).'" target="_blank" rel="noopener">'.esc_html($candidate_url).'</a></p>';

    echo '<h2>Import Material Candidates CSV</h2>';
    echo '<p>Expected columns: <code>hlc_id,hlc_url,material_url,material_link_text,brand_series_slug,product_slug,source_id,data_quality,certificate_grade,notes</code></p>';
    echo '<form method="post" enctype="multipart/form-data" style="padding:16px;background:#fff;border:1px solid #ccd0d4;max-width:1000px;">';
    wp_nonce_field('arbe_hlc_import_materials');
    echo '<input type="hidden" name="arbe_hlc_import_materials" value="1">';
    echo '<input type="file" name="materials_csv" accept=".csv" required> ';
    submit_button('Import Material Candidates', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>Import Pigment Candidates CSV</h2>';
    echo '<p>Expected columns: <code>hlc_id,hlc_url,pigment_code,pigment_url,source_id,data_quality,certificate_grade,notes</code></p>';
    echo '<form method="post" enctype="multipart/form-data" style="padding:16px;background:#fff;border:1px solid #ccd0d4;max-width:1000px;">';
    wp_nonce_field('arbe_hlc_import_pigments');
    echo '<input type="hidden" name="arbe_hlc_import_pigments" value="1">';
    echo '<input type="file" name="pigments_csv" accept=".csv" required> ';
    submit_button('Import Pigment Candidates', 'primary', 'submit', false);
    echo '</form>';

    echo '<h2>Status</h2>';
    echo '<ul><li>Targets: <strong>'.intval($counts['targets']).'</strong></li><li>Material candidates: <strong>'.intval($counts['materials']).'</strong></li><li>Pigment candidates: <strong>'.intval($counts['pigments']).'</strong></li></ul>';

    echo '<h2>Recent Material Candidates</h2>';
    if (empty($recent['materials'])) echo '<p>No material candidates imported yet.</p>';
    else {
        echo '<table class="widefat striped"><thead><tr><th>HLC</th><th>Material</th><th>Series</th><th>Quality</th></tr></thead><tbody>';
        foreach ($recent['materials'] as $m) {
            echo '<tr><td>'.esc_html($m->hlc_id).'</td><td><a href="'.esc_url($m->material_url).'" target="_blank">'.esc_html($m->material_link_text ?: $m->product_slug).'</a></td><td>'.esc_html($m->brand_series_slug).'</td><td>'.esc_html($m->data_quality).'</td></tr>';
        }
        echo '</tbody></table>';
    }

    echo '<h2>Recent Pigment Candidates</h2>';
    if (empty($recent['pigments'])) echo '<p>No pigment candidates imported yet.</p>';
    else {
        echo '<table class="widefat striped"><thead><tr><th>HLC</th><th>Pigment</th><th>URL</th><th>Quality</th></tr></thead><tbody>';
        foreach ($recent['pigments'] as $p) {
            echo '<tr><td>'.esc_html($p->hlc_id).'</td><td><code>'.esc_html($p->pigment_code).'</code></td><td><a href="'.esc_url($p->pigment_url).'" target="_blank">open</a></td><td>'.esc_html($p->data_quality).'</td></tr>';
        }
        echo '</tbody></table>';
    }

    echo '</div>';
}

?>