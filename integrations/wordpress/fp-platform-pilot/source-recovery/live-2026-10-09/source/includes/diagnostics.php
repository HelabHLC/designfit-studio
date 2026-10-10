<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_platform_diagnostics() {
    global $wpdb;

    $required_tables = [
        'color_master' => $wpdb->prefix . 'arbe_fp_color_master',
        'pigments' => $wpdb->prefix . 'arbe_fp_pigments',
        'pigment_curves' => $wpdb->prefix . 'arbe_fp_pigment_curves',
        'reference_curves' => $wpdb->prefix . 'arbe_fp_color_curves',
        'certificates' => $wpdb->prefix . 'arbe_fp_certificates',
        'audit_log' => $wpdb->prefix . 'arbe_fp_audit_log',
        'arbe_fp_import_pigment_csv_validated',
        'arbe_fp_import_reference_curve_csv_validated',
    ];

    $tables = [];
    foreach ($required_tables as $key=>$table) {
        $exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table));
        $tables[$key] = [
            'name' => $table,
            'exists' => ($exists === $table),
        ];
    }

    $required_functions = [
        'arbe_fp_solve',
        'arbe_fp_optimize_formula',
        'arbe_fp_scissor_compare_curves',
        'arbe_fp_certificate_payload',
        'arbe_fp_get_certificate_by_id_or_hash',
        'arbe_fp_mix_curves',
        'arbe_fp_audit_log',
        'arbe_fp_import_pigment_csv_validated',
        'arbe_fp_import_reference_curve_csv_validated',
    ];

    $functions = [];
    foreach ($required_functions as $fn) {
        $functions[$fn] = function_exists($fn);
    }

    $writable = [
        'uploads' => wp_is_writable(wp_upload_dir()['basedir']),
    ];

    $counts = function_exists('arbe_fp_solver_counts') ? arbe_fp_solver_counts() : [];

    $pass = true;
    foreach ($tables as $t) if (!$t['exists']) $pass = false;
    foreach ($functions as $exists) if (!$exists) $pass = false;

    return [
        'status' => $pass ? 'pass' : 'fail',
        'version' => ARBE_FP_SOLVER_VERSION,
        'installed_version' => get_option('arbe_fp_platform_version', 'unknown'),
        'php_version' => PHP_VERSION,
        'wordpress_version' => get_bloginfo('version'),
        'mysql_version' => $wpdb->db_version(),
        'site_url' => site_url(),
        'home_url' => home_url(),
        'permalink_structure' => get_option('permalink_structure'),
        'counts' => $counts,
        'tables' => $tables,
        'functions' => $functions,
        'writable' => $writable,
        'recommendations' => arbe_fp_platform_diagnostic_recommendations($tables, $functions, $writable),
    ];
}

function arbe_fp_platform_diagnostic_recommendations($tables, $functions, $writable) {
    $out = [];
    foreach ($tables as $key=>$t) {
        if (!$t['exists']) $out[] = "Missing table: {$t['name']}. Reactivate plugin or run database repair.";
    }
    foreach ($functions as $fn=>$exists) {
        if (!$exists) $out[] = "Missing function: {$fn}. Check plugin file integrity.";
    }
    if (empty($writable['uploads'])) $out[] = "Uploads directory is not writable. Exports may fail if file export is added later.";
    if (!get_option('permalink_structure')) $out[] = "Pretty permalinks are disabled. REST usually works, but enabling permalinks can improve endpoint behavior.";
    if (!$out) $out[] = "No critical issues detected.";
    return $out;
}
?>