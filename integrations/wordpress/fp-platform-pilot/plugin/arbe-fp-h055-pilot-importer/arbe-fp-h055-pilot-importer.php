<?php
/**
 * Plugin Name: ARBE FP H055 Pilot Importer
 * Description: One-reference, administrator-initiated pilot import from the reviewed CXF derivative.
 * Version: 0.1.0
 * Author: ARBE λ*
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

const ARBE_FP_H055_ID = 'H055_L060_C085';
const ARBE_FP_H055_CSV_SHA256 = '56623a4d8a6ef4c26871b4400a81d101693cfa0502c26bfcea6b5c00ec67bbca';

add_action('admin_menu', function () {
    add_management_page('ARBE FP H055 Pilot', 'ARBE FP H055 Pilot', 'manage_options', 'arbe-fp-h055-pilot', 'arbe_fp_h055_pilot_page');
});

function arbe_fp_h055_pilot_page(): void
{
    if (!current_user_can('manage_options')) {
        wp_die('Administrator access required.');
    }
    $message = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['arbe_fp_h055_import'])) {
        check_admin_referer('arbe_fp_h055_import');
        $result = arbe_fp_h055_pilot_import();
        $message = is_wp_error($result) ? $result->get_error_message() : $result;
    }
    echo '<div class="wrap"><h1>ARBE FP H055 Pilot Import</h1>';
    echo '<p>Imports only H055_L060_C085 and its 36 reviewed CXF remission points into the FP Platform master. Current pigment candidates remain a demo, not validated formulas.</p>';
    if ($message !== '') {
        echo '<div class="notice notice-info"><p>' . esc_html($message) . '</p></div>';
    }
    global $wpdb;
    $colors = $wpdb->prefix . 'arbe_fp_color_master';
    $curves = $wpdb->prefix . 'arbe_fp_color_curves';
    $count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$curves} c INNER JOIN {$colors} m ON m.id=c.color_id WHERE m.fp_color_id=%s",
        ARBE_FP_H055_ID
    ));
    echo '<p>Existing target curve points: <strong>' . esc_html((string) $count) . '</strong></p>';
    echo '<form method="post">';
    wp_nonce_field('arbe_fp_h055_import');
    echo '<input type="hidden" name="arbe_fp_h055_import" value="1">';
    submit_button('Import reviewed pilot reference');
    echo '</form></div>';
}

function arbe_fp_h055_pilot_import()
{
    global $wpdb;
    $colors = $wpdb->prefix . 'arbe_fp_color_master';
    $curves = $wpdb->prefix . 'arbe_fp_color_curves';
    $runtime = $wpdb->prefix . 'arbe_hlc_master';
    foreach ([$colors, $curves, $runtime] as $table) {
        if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table)) !== $table) {
            return new WP_Error('missing_table', 'Required table is missing: ' . $table);
        }
        $status = $wpdb->get_row($wpdb->prepare('SHOW TABLE STATUS LIKE %s', $table));
        if (!$status || (string) $status->Name !== $table
            || strcasecmp((string) $status->Engine, 'InnoDB') !== 0) {
            return new WP_Error('no_transaction', 'All target tables must use InnoDB.');
        }
    }
    $source = $wpdb->get_row($wpdb->prepare(
        "SELECT reference_id, hex, lab_l, lab_a, lab_b FROM {$runtime} WHERE reference_id=%s",
        ARBE_FP_H055_ID
    ));
    if (!$source || strtoupper((string) $source->hex) !== '#EA6700'
        || abs((float) $source->lab_l - 60.0000) > 0.0001
        || abs((float) $source->lab_a - 48.7540) > 0.0001
        || abs((float) $source->lab_b - 69.6279) > 0.0001) {
        return new WP_Error('runtime_mismatch', 'Runtime master reference does not match the reviewed source.');
    }
    $path = plugin_dir_path(__FILE__) . 'data/H055_L060_C085_reference_curves.csv';
    if (!is_readable($path) || hash_file('sha256', $path) !== ARBE_FP_H055_CSV_SHA256) {
        return new WP_Error('checksum', 'Reference curve CSV checksum mismatch.');
    }
    $handle = fopen($path, 'r');
    if (!$handle) {
        return new WP_Error('open', 'Could not read reference curve CSV.');
    }
    $header = fgetcsv($handle);
    $points = [];
    if ($header !== ['fp_color_id', 'wavelength_nm', 'remission']) {
        fclose($handle);
        return new WP_Error('header', 'Unexpected CSV header.');
    }
    while (($record = fgetcsv($handle)) !== false) {
        if (count($record) !== 3 || $record[0] !== ARBE_FP_H055_ID
            || !ctype_digit($record[1]) || !is_numeric($record[2])) {
            fclose($handle);
            return new WP_Error('row', 'Invalid CSV record.');
        }
        $wavelength = (int) $record[1];
        $remission = (float) $record[2];
        if ($wavelength !== 380 + 10 * count($points) || $remission < 0 || $remission > 1) {
            fclose($handle);
            return new WP_Error('grid', 'Invalid wavelength grid or remission.');
        }
        $points[$wavelength] = $remission;
    }
    fclose($handle);
    if (count($points) !== 36 || array_key_last($points) !== 730) {
        return new WP_Error('length', 'Expected 36 points from 380 to 730 nm.');
    }
    $existing = $wpdb->get_row($wpdb->prepare(
        "SELECT id FROM {$colors} WHERE fp_color_id=%s", ARBE_FP_H055_ID
    ));
    if ($existing) {
        return new WP_Error('exists', 'Reference already exists. Import stopped without changing it.');
    }
    if ($wpdb->query('START TRANSACTION') === false) {
        return new WP_Error('transaction', 'Could not start database transaction.');
    }
    $samples = [380, 500, 600, 730];
    $row = [
        'fp_color_id' => ARBE_FP_H055_ID, 'color_name' => ARBE_FP_H055_ID,
        'hex_value' => '#EA6700', 'rgb_value' => '234,103,0',
        'lab_l' => 60.0000, 'lab_a' => 48.7540, 'lab_b' => 69.6279,
        'source_status' => 'atlas_cxf_pilot',
    ];
    foreach ($samples as $index => $wavelength) {
        $row['psf_p' . ($index + 1) . '_nm'] = $wavelength;
        $row['psf_p' . ($index + 1) . '_r'] = $points[$wavelength];
    }
    if (!$wpdb->insert($colors, $row)) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('insert', 'FP master insert failed.');
    }
    $color_id = (int) $wpdb->insert_id;
    foreach ($points as $wavelength => $remission) {
        if (!$wpdb->insert($curves, [
            'color_id' => $color_id, 'wavelength_nm' => $wavelength,
            'remission' => $remission, 'curve_status' => 'atlas_cxf_pilot',
        ])) {
            $wpdb->query('ROLLBACK');
            return new WP_Error('curve_insert', 'Curve insert failed. Transaction rolled back.');
        }
    }
    $count = (int) $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM {$curves} WHERE color_id=%d", $color_id
    ));
    if ($count !== 36) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('count', 'Curve count verification failed. Transaction rolled back.');
    }
    if ($wpdb->query('COMMIT') === false) {
        $wpdb->query('ROLLBACK');
        return new WP_Error('commit', 'Could not commit pilot reference.');
    }
    return 'Imported H055_L060_C085 and all 36 reviewed reference curve points.';
}
