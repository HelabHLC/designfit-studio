<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_csv_open($path) {
    if (!$path || !file_exists($path)) {
        return new WP_Error('arbe_csv_missing', 'CSV file is missing.');
    }
    $fh = fopen($path, 'r');
    if (!$fh) {
        return new WP_Error('arbe_csv_open_failed', 'Could not open CSV file.');
    }
    return $fh;
}

function arbe_fp_csv_header($fh, $required) {
    $header = fgetcsv($fh);
    if (!$header) return new WP_Error('arbe_csv_no_header', 'CSV has no header row.');
    $header = array_map('trim', $header);

    $missing = [];
    foreach ($required as $col) {
        if (!in_array($col, $header, true)) $missing[] = $col;
    }

    if ($missing) {
        return new WP_Error('arbe_csv_missing_columns', 'Missing required columns: ' . implode(', ', $missing));
    }

    return $header;
}

function arbe_fp_csv_report($type) {
    return [
        'type'=>$type,
        'rows_read'=>0,
        'rows_valid'=>0,
        'rows_skipped'=>0,
        'objects_imported'=>0,
        'warnings'=>[],
        'errors'=>[],
        'duplicates'=>[],
    ];
}

function arbe_fp_csv_row_assoc($header, $data) {
    $row = [];
    foreach ($header as $i=>$h) $row[$h] = $data[$i] ?? '';
    return $row;
}

function arbe_fp_validate_wavelength($value) {
    $wl = intval($value);
    return ($wl >= 300 && $wl <= 900) ? $wl : false;
}

function arbe_fp_validate_remission($value) {
    $value = str_replace(',', '.', trim(strval($value)));
    if ($value === '' || !is_numeric($value)) return false;
    return arbe_fp_normalize_remission(floatval($value));
}

function arbe_fp_import_pigment_csv_validated($path) {
    $fh = arbe_fp_csv_open($path);
    if (is_wp_error($fh)) return $fh;

    $required = ['pigment_code','wavelength_nm','remission'];
    $header = arbe_fp_csv_header($fh, $required);
    if (is_wp_error($header)) { fclose($fh); return $header; }

    $report = arbe_fp_csv_report('pigment_curves');
    $grouped = [];
    $seen_points = [];

    while (($data = fgetcsv($fh)) !== false) {
        $report['rows_read']++;
        $row = arbe_fp_csv_row_assoc($header, $data);

        $code = strtoupper(trim($row['pigment_code'] ?? ''));
        $wl = arbe_fp_validate_wavelength($row['wavelength_nm'] ?? '');
        $r = arbe_fp_validate_remission($row['remission'] ?? '');

        if (!$code || $wl === false || $r === false) {
            $report['rows_skipped']++;
            $report['errors'][] = [
                'row'=>$report['rows_read'] + 1,
                'reason'=>'Invalid pigment_code, wavelength_nm or remission',
            ];
            continue;
        }

        $key = $code . ':' . $wl;
        if (isset($seen_points[$key])) {
            $report['duplicates'][] = $key;
        }
        $seen_points[$key] = true;

        if (!isset($grouped[$code])) {
            $grouped[$code] = [
                'pigment_code'=>$code,
                'pigment_name'=>sanitize_text_field($row['pigment_name'] ?? ''),
                'pigment_family'=>sanitize_text_field($row['pigment_family'] ?? ''),
                'source_id'=>sanitize_text_field($row['source_id'] ?? ''),
                'source_name'=>sanitize_text_field($row['source_name'] ?? ''),
                'source_url'=>esc_url_raw($row['source_url'] ?? ''),
                'curve_status'=>sanitize_text_field($row['curve_status'] ?? 'imported'),
                'curve'=>[],
            ];
        }

        $grouped[$code]['curve'][$wl] = $r;
        $report['rows_valid']++;
    }
    fclose($fh);

    foreach ($grouped as $code=>$entry) {
        if (count($entry['curve']) < 5) {
            $report['warnings'][] = "$code skipped: fewer than 5 curve points.";
            continue;
        }
        arbe_fp_save_pigment_curve($entry);
        $report['objects_imported']++;
    }

    arbe_fp_audit_log('import_pigment_csv', [
        'object_type'=>'import',
        'object_id'=>'pigment_curves',
        'payload'=>$report,
    ]);

    return $report;
}

function arbe_fp_import_reference_curve_csv_validated($path) {
    $fh = arbe_fp_csv_open($path);
    if (is_wp_error($fh)) return $fh;

    $required = ['fp_color_id','wavelength_nm','remission'];
    $header = arbe_fp_csv_header($fh, $required);
    if (is_wp_error($header)) { fclose($fh); return $header; }

    $report = arbe_fp_csv_report('reference_curves');
    $grouped = [];
    $seen_points = [];

    while (($data = fgetcsv($fh)) !== false) {
        $report['rows_read']++;
        $row = arbe_fp_csv_row_assoc($header, $data);

        $id = strtoupper(trim($row['fp_color_id'] ?? ''));
        $wl = arbe_fp_validate_wavelength($row['wavelength_nm'] ?? '');
        $r = arbe_fp_validate_remission($row['remission'] ?? '');

        if (!$id || $wl === false || $r === false) {
            $report['rows_skipped']++;
            $report['errors'][] = [
                'row'=>$report['rows_read'] + 1,
                'reason'=>'Invalid fp_color_id, wavelength_nm or remission',
            ];
            continue;
        }

        if (!arbe_fp_get_color($id)) {
            $report['rows_skipped']++;
            $report['errors'][] = [
                'row'=>$report['rows_read'] + 1,
                'reason'=>"FP-Color not found in master: $id",
            ];
            continue;
        }

        $key = $id . ':' . $wl;
        if (isset($seen_points[$key])) $report['duplicates'][] = $key;
        $seen_points[$key] = true;

        if (!isset($grouped[$id])) $grouped[$id] = [];
        $grouped[$id][$wl] = $r;
        $report['rows_valid']++;
    }
    fclose($fh);

    foreach ($grouped as $id=>$curve) {
        if (count($curve) < 5) {
            $report['warnings'][] = "$id skipped: fewer than 5 curve points.";
            continue;
        }
        if (arbe_fp_save_color_curve($id, $curve, 'measured')) {
            $report['objects_imported']++;
        }
    }

    arbe_fp_audit_log('import_reference_csv', [
        'object_type'=>'import',
        'object_id'=>'reference_curves',
        'payload'=>$report,
    ]);

    return $report;
}

function arbe_fp_render_import_report($report) {
    if (is_wp_error($report)) {
        return '<div class="notice notice-error"><p>' . esc_html($report->get_error_message()) . '</p></div>';
    }

    $html = '<div class="notice notice-success"><p><strong>Import complete:</strong> ' . esc_html($report['objects_imported']) . ' objects imported.</p>';
    $html .= '<p>Rows read: ' . intval($report['rows_read']) . ' · valid: ' . intval($report['rows_valid']) . ' · skipped: ' . intval($report['rows_skipped']) . '</p>';

    if (!empty($report['warnings'])) {
        $html .= '<p><strong>Warnings:</strong></p><ul>';
        foreach (array_slice($report['warnings'], 0, 10) as $w) $html .= '<li>' . esc_html($w) . '</li>';
        $html .= '</ul>';
    }

    if (!empty($report['errors'])) {
        $html .= '<p><strong>Errors:</strong></p><ul>';
        foreach (array_slice($report['errors'], 0, 10) as $e) $html .= '<li>Row ' . intval($e['row']) . ': ' . esc_html($e['reason']) . '</li>';
        $html .= '</ul>';
    }

    if (!empty($report['duplicates'])) {
        $html .= '<p><strong>Duplicate curve points:</strong> ' . intval(count($report['duplicates'])) . '</p>';
    }

    $html .= '</div>';
    return $html;
}
?>