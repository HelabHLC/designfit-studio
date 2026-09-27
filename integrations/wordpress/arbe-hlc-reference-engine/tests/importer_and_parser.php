<?php
// Standalone regression checks; no WordPress database or runtime CSV needed.
define('ABSPATH', __DIR__);
$fixtureDir = sys_get_temp_dir() . '/arbe-reference-test-' . bin2hex(random_bytes(4)) . '/';
mkdir($fixtureDir . 'data', 0700, true);
define('ARBE_HLC_PLUGIN_DIR', $fixtureDir);
define('ARBE_HLC_MASTER_VERSION', 'runtime_master_mysql_v1');

$options = [];
function get_option($key, $default = false) {
    global $options;
    return $options[$key] ?? $default;
}
function update_option($key, $value) {
    global $options;
    $options[$key] = $value;
}
function current_time($format) { return '2026-09-27 00:00:00'; }

class FakeDB {
    public $prefix = 'test_';
    public $last_error = '';
    public $rows = [];
    public function replace($table, $row, $formats) {
        $this->rows[$row['reference_id']] = $row;
        return 1;
    }
}
$wpdb = new FakeDB();
class ARBE_HLC_DB {
    public static function table_name(): string { return 'test_arbe_hlc_master'; }
    public static function count_rows(): int {
        global $wpdb;
        return count($wpdb->rows);
    }
}
require __DIR__ . '/../includes/class-arbe-hlc-importer.php';
require __DIR__ . '/../includes/class-arbe-hlc-matcher.php';

function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
function write_fixture(array $references) {
    global $fixtureDir, $options, $wpdb;
    $options = [];
    $wpdb->rows = [];
    $fh = fopen($fixtureDir . 'data/runtime-master-v1.csv', 'w');
    fputcsv($fh, ['reference','lab_L','lab_a','lab_b','hex','rgb',
        'lambda_v2_nm','lambda_ee_nm','delta_lambda_nm','mu2_nm2',
        'sigma_star_nm','mu3_nm3','lambda_v2_method','atlas_identity_valid']);
    foreach ($references as $reference) {
        fputcsv($fh, [$reference, 80, 10, 59, '#EEBE53', '[238, 190, 83]',
            549.435, 609.2139, -59.7789, 6798.1769, 82.4511,
            -345554.9745, 'Brent', 'True']);
    }
    fclose($fh);
}

try {
    $parse = new ReflectionMethod(ARBE_HLC_Matcher::class, 'extract_reference');
    check($parse->invoke(null, 'H080_L080_C060') === 'H080_L080_C060', 'exact HLC');
    check($parse->invoke(null, 'FP::H080_L080_C060::H080') === 'H080_L080_C060', 'FP prefix');
    check($parse->invoke(null, 'FP1|ID=H080_L080_C060|ST=SCISSOR') === 'H080_L080_C060', 'FP1 prefix');
    check($parse->invoke(null, 'unverified note H080_L080_C060 trailing') === null, 'embedded HLC rejected');
    check($parse->invoke(null, 'H080_L080_C060_extra') === null, 'suffix rejected');

    write_fixture(['H000_L095_C000', 'H080_L080_C060']);
    $first = ARBE_HLC_Importer::import_chunk(0, 1);
    check(!$first['done'] && $first['offset'] === 1, 'first chunk offset');
    $second = ARBE_HLC_Importer::import_chunk(1, 1);
    check($second['done'] && empty($second['error']), 'second chunk complete');
    check(get_option('arbe_hlc_install_state') === 'ready', 'complete import ready');

    write_fixture(['H000_L095_C000', 'invalid']);
    ARBE_HLC_Importer::import_chunk(0, 1);
    $bad = ARBE_HLC_Importer::import_chunk(1, 1);
    check(!empty($bad['error']) && $bad['offset'] === 1, 'invalid row stops at offset');
    check(get_option('arbe_hlc_install_state') === 'error', 'invalid row not ready');

    write_fixture(['H000_L095_C000', 'H000_L095_C000']);
    $duplicate = ARBE_HLC_Importer::import_chunk(0, 2);
    check(!empty($duplicate['error']), 'duplicate final count rejected');
    echo "PASS: strict reference parsing and import progress/error gates\n";
} finally {
    @unlink($fixtureDir . 'data/runtime-master-v1.csv');
    @rmdir($fixtureDir . 'data');
    @rmdir($fixtureDir);
}
