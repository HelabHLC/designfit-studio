<?php
if (!defined('ABSPATH')) { exit; }

function arbe_hlc_acq_create_tables() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();

    $targets = $wpdb->prefix . 'arbe_hlc_acquisition_targets';
    $materials = $wpdb->prefix . 'arbe_material_candidates';
    $pigments = $wpdb->prefix . 'arbe_pigment_candidates';

    dbDelta("CREATE TABLE $targets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hlc_id VARCHAR(64) NOT NULL,
      fp_id VARCHAR(128) NULL,
      source_url TEXT NULL,
      acquisition_status VARCHAR(64) DEFAULT 'pending',
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY hlc_id_unique (hlc_id)
    ) $charset;");

    dbDelta("CREATE TABLE $materials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hlc_id VARCHAR(64) NOT NULL,
      material_url TEXT NOT NULL,
      material_link_text TEXT NULL,
      brand_series_slug VARCHAR(255) NULL,
      product_slug VARCHAR(255) NULL,
      source_id VARCHAR(128) DEFAULT 'ARTISTPIGMENTS_HLC_ATLAS',
      data_quality VARCHAR(64) DEFAULT 'metadata_only_pending_spectral_access',
      certificate_grade TINYINT DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY hlc_idx (hlc_id)
    ) $charset;");

    dbDelta("CREATE TABLE $pigments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      hlc_id VARCHAR(64) NOT NULL,
      pigment_code VARCHAR(64) NOT NULL,
      pigment_url TEXT NULL,
      source_id VARCHAR(128) DEFAULT 'ARTISTPIGMENTS_HLC_ATLAS',
      data_quality VARCHAR(64) DEFAULT 'metadata_only_pending_spectral_access',
      certificate_grade TINYINT DEFAULT 0,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY hlc_idx (hlc_id),
      KEY pigment_idx (pigment_code)
    ) $charset;");
}

function arbe_hlc_acq_normalize_hlc($value) {
    $value = strtoupper(trim(strval($value)));
    $value = str_replace(['FP::','FP:'], '', $value);
    if (preg_match('/H\d{3}_L\d{3}_C\d{3}/', $value, $m)) return $m[0];
    return $value;
}

function arbe_hlc_acq_url($hlc_id) {
    return 'https://artistpigments.org/hlc_atlas/' . rawurlencode(arbe_hlc_acq_normalize_hlc($hlc_id));
}

function arbe_hlc_acq_counts() {
    global $wpdb;
    return [
        'targets'=>intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_hlc_acquisition_targets")),
        'materials'=>intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_material_candidates")),
        'pigments'=>intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_pigment_candidates")),
    ];
}

function arbe_hlc_acq_import_material_candidates_csv($path) {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_material_candidates';
    $fh = fopen($path, 'r');
    if (!$fh) return new WP_Error('csv_open_failed', 'CSV could not be opened.');

    $header = array_map('trim', fgetcsv($fh));
    $required = ['hlc_id','material_url'];
    foreach ($required as $r) {
        if (!in_array($r, $header, true)) {
            fclose($fh);
            return new WP_Error('missing_column', 'Missing required column: ' . $r);
        }
    }

    $count = 0; $skipped = 0;
    while (($data = fgetcsv($fh)) !== false) {
        $row = [];
        foreach ($header as $i=>$h) $row[$h] = $data[$i] ?? '';

        $hlc = arbe_hlc_acq_normalize_hlc($row['hlc_id'] ?? '');
        $url = esc_url_raw($row['material_url'] ?? '');
        if (!$hlc || !$url) { $skipped++; continue; }

        $wpdb->insert($table, [
            'hlc_id'=>$hlc,
            'material_url'=>$url,
            'material_link_text'=>sanitize_text_field($row['material_link_text'] ?? ''),
            'brand_series_slug'=>sanitize_text_field($row['brand_series_slug'] ?? ''),
            'product_slug'=>sanitize_text_field($row['product_slug'] ?? ''),
            'source_id'=>sanitize_text_field($row['source_id'] ?? 'ARTISTPIGMENTS_HLC_ATLAS'),
            'data_quality'=>sanitize_text_field($row['data_quality'] ?? 'metadata_only_pending_spectral_access'),
            'certificate_grade'=>0,
            'notes'=>sanitize_textarea_field($row['notes'] ?? ''),
        ]);
        $count++;
    }
    fclose($fh);
    if (function_exists('arbe_fp_audit_log')) {
        arbe_fp_audit_log('hlc_material_candidates_imported', ['object_type'=>'hlc_acquisition', 'payload'=>['imported'=>$count, 'skipped'=>$skipped]]);
    }
    return ['imported'=>$count, 'skipped'=>$skipped];
}

function arbe_hlc_acq_import_pigment_candidates_csv($path) {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_pigment_candidates';
    $fh = fopen($path, 'r');
    if (!$fh) return new WP_Error('csv_open_failed', 'CSV could not be opened.');

    $header = array_map('trim', fgetcsv($fh));
    $required = ['hlc_id','pigment_code'];
    foreach ($required as $r) {
        if (!in_array($r, $header, true)) {
            fclose($fh);
            return new WP_Error('missing_column', 'Missing required column: ' . $r);
        }
    }

    $count = 0; $skipped = 0;
    while (($data = fgetcsv($fh)) !== false) {
        $row = [];
        foreach ($header as $i=>$h) $row[$h] = $data[$i] ?? '';

        $hlc = arbe_hlc_acq_normalize_hlc($row['hlc_id'] ?? '');
        $code = strtoupper(trim($row['pigment_code'] ?? ''));
        if (!$hlc || !$code) { $skipped++; continue; }

        $wpdb->insert($table, [
            'hlc_id'=>$hlc,
            'pigment_code'=>$code,
            'pigment_url'=>esc_url_raw($row['pigment_url'] ?? ''),
            'source_id'=>sanitize_text_field($row['source_id'] ?? 'ARTISTPIGMENTS_HLC_ATLAS'),
            'data_quality'=>sanitize_text_field($row['data_quality'] ?? 'metadata_only_pending_spectral_access'),
            'certificate_grade'=>0,
            'notes'=>sanitize_textarea_field($row['notes'] ?? ''),
        ]);
        $count++;
    }
    fclose($fh);
    if (function_exists('arbe_fp_audit_log')) {
        arbe_fp_audit_log('hlc_pigment_candidates_imported', ['object_type'=>'hlc_acquisition', 'payload'=>['imported'=>$count, 'skipped'=>$skipped]]);
    }
    return ['imported'=>$count, 'skipped'=>$skipped];
}

function arbe_hlc_acq_recent_candidates($hlc_id='', $limit=25) {
    global $wpdb;
    $where = '';
    $params = [];
    if ($hlc_id) {
        $where = 'WHERE hlc_id=%s';
        $params[] = arbe_hlc_acq_normalize_hlc($hlc_id);
    }
    $limit = max(1, min(200, intval($limit)));
    if ($params) {
        return [
            'materials'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}arbe_material_candidates $where ORDER BY created_at DESC LIMIT %d", $params[0], $limit)),
            'pigments'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}arbe_pigment_candidates $where ORDER BY created_at DESC LIMIT %d", $params[0], $limit)),
        ];
    }
    return [
        'materials'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}arbe_material_candidates ORDER BY created_at DESC LIMIT %d", $limit)),
        'pigments'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}arbe_pigment_candidates ORDER BY created_at DESC LIMIT %d", $limit)),
    ];
}

function arbe_hlc_acq_render_report($result, $label) {
    if (is_wp_error($result)) {
        return '<div class="notice notice-error"><p>'.esc_html($result->get_error_message()).'</p></div>';
    }
    return '<div class="notice notice-success"><p><strong>'.esc_html($label).':</strong> imported '.intval($result['imported']).', skipped '.intval($result['skipped']).'.</p></div>';
}

function arbe_hlc_acq_pigment_codes_for_hlc($hlc_id) {
    global $wpdb;
    $hlc_id = arbe_hlc_acq_normalize_hlc($hlc_id);
    if (!$hlc_id) return [];

    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT DISTINCT pigment_code FROM {$wpdb->prefix}arbe_pigment_candidates WHERE hlc_id=%s ORDER BY pigment_code ASC",
        $hlc_id
    ));

    $codes = [];
    foreach ($rows as $r) {
        $code = strtoupper(trim($r->pigment_code));
        if ($code && !in_array($code, $codes, true)) $codes[] = $code;
    }
    return $codes;
}

function arbe_hlc_acq_available_pigments_for_hlc($hlc_id) {
    $codes = arbe_hlc_acq_pigment_codes_for_hlc($hlc_id);
    if (!$codes) return [];

    $available = [];
    foreach ($codes as $code) {
        $p = arbe_fp_get_pigment($code);
        if ($p) {
            $curve = arbe_fp_get_curve($p->id);
            if ($curve) $available[] = $p;
        }
    }
    return $available;
}

?>