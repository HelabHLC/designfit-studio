<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_Importer {
    public static function data_file(): string {
        return ARBE_HLC_PLUGIN_DIR . 'data/runtime-master-v1.csv';
    }

    public static function total_rows(): int {
        $cached = get_option('arbe_hlc_import_total_rows');
        if ($cached !== false) {
            return (int) $cached;
        }

        $file = self::data_file();
        if (!file_exists($file)) {
            return 0;
        }

        $count = 0;
        $fh = new SplFileObject($file, 'r');
        $fh->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY);
        foreach ($fh as $row) {
            if (!empty($row) && !empty($row[0])) {
                $count++;
            }
        }

        $count = max(0, $count - 1); // header
        update_option('arbe_hlc_import_total_rows', $count);
        return $count;
    }

    public static function reset(): void {
        global $wpdb;
        $table = ARBE_HLC_DB::table_name();
        $wpdb->query("TRUNCATE TABLE {$table}");
        update_option('arbe_hlc_install_state', 'pending');
        update_option('arbe_hlc_import_offset', 0);
        update_option('arbe_hlc_import_error', '');
        update_option('arbe_hlc_master_version', ARBE_HLC_MASTER_VERSION);
    }

    public static function import_chunk(int $offset = -1, int $limit = 200): array {
        global $wpdb;

        $file = self::data_file();
        if (!file_exists($file)) {
            update_option('arbe_hlc_install_state', 'error');
            update_option('arbe_hlc_import_error', 'Runtime master CSV not found in plugin package.');
            return [
                'done' => true,
                'offset' => 0,
                'imported' => 0,
                'total' => 0,
                'message' => 'Runtime master CSV not found.',
                'error' => true,
            ];
        }

        $stored_offset = (int) get_option('arbe_hlc_import_offset', 0);
        if ($offset < 0) {
            $offset = $stored_offset;
        }

        update_option('arbe_hlc_install_state', 'importing');

        $table = ARBE_HLC_DB::table_name();
        $total = self::total_rows();
        $imported = 0;

        $fh = new SplFileObject($file, 'r');
        $fh->setFlags(SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY);
        $fh->seek($offset + 1); // skip header

        $now = current_time('mysql');

        while (!$fh->eof() && $imported < $limit && $offset + $imported < $total) {
            $row = $fh->current();
            $fh->next();

            if (!is_array($row) || count($row) < 14 || empty($row[0])) {
                return self::fail_import($offset + $imported, 'Incomplete runtime master row.');
            }

            $record = self::normalize_row($row);
            if ($record === null) {
                return self::fail_import($offset + $imported, 'Invalid reference or Brent validation in runtime master.');
            }

            $result = $wpdb->replace(
                $table,
                [
                    'reference_id' => $record['reference_id'],
                    'lab_l' => $record['lab_l'],
                    'lab_a' => $record['lab_a'],
                    'lab_b' => $record['lab_b'],
                    'hex' => $record['hex'],
                    'rgb' => $record['rgb'],
                    'lambda_v2_nm' => $record['lambda_v2_nm'],
                    'lambda_ee_nm' => $record['lambda_ee_nm'],
                    'delta_lambda_nm' => $record['delta_lambda_nm'],
                    'mu2_nm2' => $record['mu2_nm2'],
                    'sigma_star_nm' => $record['sigma_star_nm'],
                    'mu3_nm3' => $record['mu3_nm3'],
                    'lambda_v2_method' => $record['lambda_v2_method'],
                    'atlas_identity_valid' => $record['atlas_identity_valid'],
                    'imported_at' => $now,
                ],
                [
                    '%s','%f','%f','%f','%s','%s','%f','%f','%f','%f','%f','%f','%s','%d','%s'
                ]
            );

            if ($result === false) {
                $message = 'Database import failed near offset ' . $offset . ': ' . $wpdb->last_error;
                return self::fail_import($offset + $imported, $message);
            }

            $imported++;
        }

        $new_offset = min($offset + $imported, $total);
        update_option('arbe_hlc_import_offset', $new_offset);

        $done = $new_offset >= $total;
        if ($done) {
            if (ARBE_HLC_DB::count_rows() !== $total) {
                return self::fail_import($new_offset, 'Imported row count does not match runtime master.');
            }
            update_option('arbe_hlc_install_state', 'ready');
            update_option('arbe_hlc_import_error', '');
        }

        return [
            'done' => $done,
            'offset' => $new_offset,
            'imported' => $imported,
            'total' => $total,
            'message' => $done ? 'Import completed.' : 'Chunk imported.',
        ];
    }

    private static function fail_import(int $offset, string $message): array {
        update_option('arbe_hlc_install_state', 'error');
        update_option('arbe_hlc_import_error', $message);
        update_option('arbe_hlc_import_offset', $offset);
        return [
            'done' => true,
            'offset' => $offset,
            'imported' => 0,
            'total' => self::total_rows(),
            'message' => $message,
            'error' => true,
        ];
    }

    private static function normalize_row(array $row): ?array {
        $reference = trim((string) ($row[0] ?? ''));
        $lambda_method = trim((string) ($row[12] ?? ''));
        $identity_valid = strtolower(trim((string) ($row[13] ?? '')));

        if (!preg_match('/^H\d{3}_L\d{3}_C\d{3}$/', $reference)) {
            return null;
        }

        if ($lambda_method !== 'Brent') {
            return null;
        }

        if (!in_array($identity_valid, ['1', 'true', 'yes'], true)) {
            return null;
        }

        return [
            'reference_id' => $reference,
            'lab_l' => (float) $row[1],
            'lab_a' => (float) $row[2],
            'lab_b' => (float) $row[3],
            'hex' => self::clean_hex((string) $row[4]),
            'rgb' => self::clean_rgb((string) $row[5]),
            'lambda_v2_nm' => self::nullable_float($row[6]),
            'lambda_ee_nm' => self::nullable_float($row[7]),
            'delta_lambda_nm' => self::nullable_float($row[8]),
            'mu2_nm2' => self::nullable_float($row[9]),
            'sigma_star_nm' => self::nullable_float($row[10]),
            'mu3_nm3' => self::nullable_float($row[11]),
            'lambda_v2_method' => $lambda_method,
            'atlas_identity_valid' => 1,
        ];
    }

    private static function nullable_float($value): ?float {
        if ($value === '' || $value === null) {
            return null;
        }
        return (float) $value;
    }

    private static function clean_hex(string $hex): ?string {
        $hex = strtoupper(trim($hex));
        return preg_match('/^#[0-9A-F]{6}$/', $hex) ? $hex : null;
    }

    private static function clean_rgb(string $rgb): ?string {
        $rgb = trim($rgb);
        return $rgb !== '' ? $rgb : null;
    }
}
