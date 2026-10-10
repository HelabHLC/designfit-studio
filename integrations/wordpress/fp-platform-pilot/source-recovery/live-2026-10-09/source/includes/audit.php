<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_audit_log($event_type, $args=[]) {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_fp_audit_log';

    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $salt = wp_salt('auth');
    $ip_hash = $ip ? hash('sha256', $ip . '|' . $salt) : '';

    $data = [
        'event_type' => sanitize_text_field($event_type),
        'object_type' => sanitize_text_field($args['object_type'] ?? ''),
        'object_id' => sanitize_text_field($args['object_id'] ?? ''),
        'fp_color_id' => sanitize_text_field($args['fp_color_id'] ?? ''),
        'user_id' => get_current_user_id() ?: null,
        'ip_hash' => $ip_hash,
        'payload' => wp_json_encode($args['payload'] ?? [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ];

    $wpdb->insert($table, $data);
    return intval($wpdb->insert_id);
}

function arbe_fp_audit_recent($limit=50) {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_fp_audit_log';
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table ORDER BY created_at DESC LIMIT %d",
        max(1, min(200, intval($limit)))
    ));
}
?>