<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_DB {
    public static function table_name(): string {
        global $wpdb;
        return $wpdb->prefix . 'arbe_hlc_master';
    }

    public static function activate(): void {
        if (!self::table_exists()) {
            self::create_tables();
        }
        if (get_option('arbe_hlc_install_state') === false) {
            update_option('arbe_hlc_install_state', 'pending');
        }
        update_option('arbe_hlc_master_version', ARBE_HLC_MASTER_VERSION);
    }

    public static function deactivate(): void {
        // Keep imported data by design.
    }

    public static function maybe_upgrade(): void {
    $installed = get_option('arbe_hlc_plugin_version', '');
    if ($installed !== ARBE_HLC_PLUGIN_VERSION) {
        if (!self::table_exists()) {
            self::create_tables();
        }
        update_option('arbe_hlc_plugin_version', ARBE_HLC_PLUGIN_VERSION);
    }
}

    public static function table_exists(): bool {
    global $wpdb;
    $table = self::table_name();
    $found = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table));
    return $found === $table;
}

    public static function create_tables(): void {
        global $wpdb;

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $table = self::table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            reference_id VARCHAR(20) NOT NULL,
            lab_l DECIMAL(10,4) NOT NULL,
            lab_a DECIMAL(10,4) NOT NULL,
            lab_b DECIMAL(10,4) NOT NULL,
            hex VARCHAR(7) DEFAULT NULL,
            rgb VARCHAR(32) DEFAULT NULL,
            lambda_v2_nm DECIMAL(10,4) DEFAULT NULL,
            lambda_ee_nm DECIMAL(10,4) DEFAULT NULL,
            delta_lambda_nm DECIMAL(10,4) DEFAULT NULL,
            mu2_nm2 DECIMAL(14,4) DEFAULT NULL,
            sigma_star_nm DECIMAL(10,4) DEFAULT NULL,
            mu3_nm3 DECIMAL(18,4) DEFAULT NULL,
            lambda_v2_method VARCHAR(32) DEFAULT NULL,
            atlas_identity_valid TINYINT(1) NOT NULL DEFAULT 1,
            imported_at DATETIME NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY reference_id (reference_id),
            KEY lab_l (lab_l),
            KEY lab_a (lab_a),
            KEY lab_b (lab_b)
        ) {$charset_collate};";

        dbDelta($sql);
    }

    public static function count_rows(): int {
        global $wpdb;
        $table = self::table_name();
        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$table}");
    }

    public static function is_ready(): bool {
        $total = ARBE_HLC_Importer::total_rows();
        return get_option('arbe_hlc_install_state') === 'ready'
            && $total > 0
            && self::count_rows() === $total;
    }
}
