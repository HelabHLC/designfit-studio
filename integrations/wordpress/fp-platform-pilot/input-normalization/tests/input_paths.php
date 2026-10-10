<?php
/** Offline input-path regression. Synthetic inputs; no WordPress or live DB.
 * Real candidate parser, database, solver, search, shortcode and REST modules.
 * The lookup double stops before computation, or returns a missing row.
 */
error_reporting(E_ALL);
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
define('ABSPATH', __DIR__ . '/');
$source = $argv[1] ?? throw new RuntimeException('Candidate source directory required');
$shortcodes = $actions = $routes = [];
$checks = $calls = 0;
function check($actual, $expected, $label) {
    global $checks;
    if ($actual !== $expected) {
        throw new RuntimeException($label . ': expected ' . var_export($expected, true)
            . ', got ' . var_export($actual, true));
    }
    $checks++;
}
function add_shortcode($name, $callback) { $GLOBALS['shortcodes'][$name] = $callback; }
function add_action($name, $callback) { $GLOBALS['actions'][$name][] = $callback; }
function register_rest_route($namespace, $path, $args) { $GLOBALS['routes'][$namespace . $path] = $args['callback']; }
function shortcode_atts($defaults, $atts) { return array_merge($defaults, array_intersect_key($atts, $defaults)); }
function wp_parse_args($args, $defaults) { return array_merge($defaults, $args); }
function esc_attr($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function add_query_arg($args) { return '/offline?' . http_build_query($args); }
function sanitize_text_field($value) { return trim(strip_tags((string)$value)); }
function wp_json_encode($value, $flags = 0) { return json_encode($value, $flags); }
function is_wp_error($value) { return $value instanceof WP_Error; }
// Only the two literal child shortcodes produced by [arbe_fp] modes are needed.
// This is not a substitute for a full WordPress shortcode tokenizer test.
function do_shortcode($text) {
    if (!preg_match('/^\[(arbe_fp_solver_card|arbe_fp_certificate) color="([^"]*)"\]$/', $text, $m)) {
        throw new RuntimeException('Unexpected nested shortcode: ' . $text);
    }
    return $GLOBALS['shortcodes'][$m[1]](['color' => $m[2]]);
}
class WP_REST_Request {
    public function __construct(private array $params) {}
    public function get_param($name) { return $this->params[$name] ?? null; }
}
class WP_Error {
    public function __construct(private $code, private $message, private $data) {}
    public function get_error_code() { return $this->code; }
    public function get_error_message() { return $this->message; }
    public function get_error_data() { return $this->data; }
}
class LookupReached extends RuntimeException {}
class RecordingDatabase {
    public string $prefix = 'offline_';
    public array $lookups = [];
    public bool $missing = false;
    public ?object $colorFixture = null;
    public function prepare($sql, ...$args) { return ['sql' => $sql, 'args' => $args]; }
    public function get_row($query) {
        $this->lookups[] = $query;
        if ($this->colorFixture !== null) {
            check($query['args'], [$this->colorFixture->fp_color_id], 'solver uses fixture reference key');
            return $this->colorFixture;
        }
        if ($this->missing) { return null; }
        throw new LookupReached('Stopped at reference SELECT');
    }
    public function get_results($query) {
        if ($this->colorFixture === null) { throw new RuntimeException('Unexpected curve access'); }
        check($query['sql'], 'SELECT wavelength_nm, remission FROM offline_arbe_fp_color_curves WHERE color_id=%d ORDER BY wavelength_nm ASC', 'curve query is unchanged');
        check($query['args'], [$this->colorFixture->id], 'curve uses stored master row');
        return [];
    }
    public function __call($name, $args) { throw new RuntimeException('Unexpected DB operation: ' . $name); }
}
$wpdb = new RecordingDatabase();
require $source . '/includes/database.php';
require $source . '/includes/solver.php';
// Solver can be loaded/called without loading the spectral-search UI module.
check(arbe_fp_parse_color_query('FP::H055_L060_C085::opaque'), 'H055_L060_C085', 'solver loads shared parser');
lookup('standalone solver before search module', fn() => arbe_fp_solve('FP::H055_L060_C085::opaque'), 'H055_L060_C085');
require $source . '/includes/spectral-search.php';
require $source . '/includes/shortcodes.php';
require $source . '/includes/rest-api.php';
foreach ($actions['rest_api_init'] as $register) { $register(); }

$id = 'H055_L060_C085';
$other = 'H095_L090_C105';
$full = 'FP::' . $id . '::TEST_PAYLOAD=synthetic::UNVERIFIED=1';
// Expected lookup keys are explicit, never obtained by calling the parser.
$cases = [
    ['bare address', $id, $id],
    ['lowercase', strtolower($id), $id],
    ['surrounding whitespace', " \t" . $id . "\r\n", $id],
    ['legacy single colon', 'FP:' . $id, $id],
    ['legacy prefix spacing', " fp: \t" . strtolower($id) . ' ', $id],
    ['double colon short form', 'FP::' . $id, $id],
    ['synthetic full code', $full, $id],
    ['lowercase full code', strtolower($full), $id],
    ['full code whitespace', "\t" . $full . "\n", $id],
    ['empty payload', 'FP::' . $id . '::', $id],
    ['opaque arbitrary payload', 'FP::' . $id . '::not-validated', $id],
    ['second address stays payload', 'FP::' . $id . '::' . $other, $id],
    ['nested code stays payload', 'FP::' . $id . '::FP::' . $other . '::X', $id],
    ['non-ASCII payload', 'FP::' . $id . '::ä色', $id],
    ['multiline payload', 'FP::' . $id . "::x\ny", $id],
    ['numeric payload', 'FP::' . $id . '::0', $id],
    ['HTML-like payload', 'FP::' . $id . '::<script>synthetic</script>', $id],
    ['SQL-like payload', 'FP::' . $id . "::' OR 1=1 --", $id],
    ['unknown master address', 'FP::H999_L999_C999::X', 'H999_L999_C999'],
    ['legacy literal database key', ' custom-reference ', 'CUSTOM-REFERENCE'],
    ['legacy prefixed literal key', ' fp: custom-reference ', 'CUSTOM-REFERENCE'],
    ['prefix only', 'FP:', ''],
    ['empty', '', ''],
    ['whitespace only', " \t\r\n", ''],
    ['null', null, ''],
    ['array', [$id], ''],
    ['nested array', ['fp_color' => [$id]], ''],
    ['object', (object)['color' => $id], ''],
    ['stringable object is not an input string', new class {
        public function __toString() { throw new RuntimeException('Must not coerce objects'); }
    }, ''],
    ['integer keeps scalar conversion', 123, '123'],
    ['boolean keeps scalar conversion', true, '1'],
    ['false remains empty', false, ''],
    ['wrong width', 'FP::H55_L060_C085::X', 'FP::H55_L060_C085::X'],
    ['extra digit', 'FP::H055_L060_C0850::X', 'FP::H055_L060_C0850::X'],
    ['missing separator', 'FP::' . $id . ':X', 'FP::' . $id . ':X'],
    ['embedded full code', 'PREFIX FP::' . $id . '::X', 'PREFIX FP::' . $id . '::X'],
    ['trailing short-form garbage', $id . 'X', $id . 'X'],
    ['single-colon payload stays a literal key', 'FP:' . $id . '::X', $id . '::X'],
    ['repeated prefix', 'FP:FP::' . $id . '::X', 'FP:FP::' . $id . '::X'],
    ['embedded prefix is not repaired', 'H055_FP:L060_C085', 'H055_FP:L060_C085'],
    ['prefix-created-by-deletion is not repaired', 'FFP:P::' . $id . '::X', 'FFP:P::' . $id . '::X'],
    ['internal address whitespace', 'FP::H055_ L060_C085::X', 'FP::H055_ L060_C085::X'],
    ['newline before delimiter', 'FP::' . $id . "\n::X", 'FP::' . $id . "\n::X"],
    ['URL encoding is transport responsibility', 'FP%3A%3A' . $id, 'FP%3A%3A' . $id],
    // The existing nested shortcode serializer HTML-escapes a literal quote.
    // Its separately pinned key still cannot resolve to the reference address.
    ['SQL-like lookup stays bound data', $id . "' OR 1=1 --", $id . "' OR 1=1 --", $id . '&#039; OR 1=1 --'],
];

function paths($input) {
    global $shortcodes, $routes;
    $paths = [
        'direct solve' => fn() => arbe_fp_solve($input),
        'direct search' => fn() => arbe_fp_spectral_search($input),
    ];
    foreach (['solve', 'spectral-search', 'certificate'] as $route) {
        $paths['REST ' . $route] = fn() => $routes['arbe/v1/' . $route](new WP_REST_Request(['color' => $input]));
    }
    foreach (['arbe_fp', 'arbe_spectral_search', 'arbe_fp_structural_solver',
              'arbe_fp_solver_result', 'arbe_fp_solver_card', 'arbe_fp_certificate',
              'arbe_fp_certificate_json'] as $name) {
        $paths[$name . ' attribute'] = function() use ($name, $input, $shortcodes) {
            $_GET = [];
            return $shortcodes[$name](['color' => $input]);
        };
        $paths[$name . ' GET'] = function() use ($name, $input, $shortcodes) {
            $_GET = ['fp_color' => $input];
            return $shortcodes[$name]([]);
        };
    }
    foreach (['card', 'certificate'] as $mode) {
        $paths['arbe_fp mode=' . $mode . ' GET'] = function() use ($mode, $input, $shortcodes) {
            $_GET = ['fp_color' => $input];
            return $shortcodes['arbe_fp'](['mode' => $mode]);
        };
        // Real WP shortcode attributes are strings; malformed HTTP arrays are
        // exercised via GET, without forcing them through the tokenizer double.
        if (is_string($input)) {
            $paths['arbe_fp mode=' . $mode . ' attribute'] = function() use ($mode, $input, $shortcodes) {
                $_GET = [];
                return $shortcodes['arbe_fp'](['mode' => $mode, 'color' => $input]);
            };
        }
    }
    return $paths;
}
function invoke($callback) {
    $level = ob_get_level();
    try { return $callback(); }
    finally { while (ob_get_level() > $level) { ob_end_clean(); } $_GET = []; }
}
function lookup($label, $callback, $expected) {
    global $wpdb, $calls;
    $wpdb->lookups = [];
    $reached = false;
    try { invoke($callback); }
    catch (LookupReached $e) { $reached = true; }
    $calls++;
    check($reached, $expected !== '', $label . ': lookup reached');
    check(count($wpdb->lookups), $expected === '' ? 0 : 1, $label . ': lookup count');
    if ($expected !== '') {
        check($wpdb->lookups[0]['sql'], 'SELECT * FROM offline_arbe_fp_color_master WHERE fp_color_id=%s', $label . ': prepared equality SELECT');
        check($wpdb->lookups[0]['args'], [$expected], $label . ': bound key');
    }
}
foreach ($cases as $case) {
    [$label, $input, $expected] = $case;
    check(arbe_fp_parse_color_query($input), $expected, $label . ': parser');
    check(arbe_fp_parse_color_query($expected), $expected, $label . ': idempotent');
    foreach (paths($input) as $path => $callback) {
        $key = str_contains($path, 'mode=') && str_ends_with($path, ' attribute') ? ($case[3] ?? $expected) : $expected;
        lookup($label . ' / ' . $path, $callback, $key);
    }
}

// Preserve GET precedence (including an explicit empty GET) and null fallback.
foreach (['arbe_fp', 'arbe_spectral_search', 'arbe_fp_structural_solver',
          'arbe_fp_solver_result', 'arbe_fp_solver_card', 'arbe_fp_certificate', 'arbe_fp_certificate_json'] as $name) {
    foreach ([[$full, $id], ['', ''], [null, $other]] as [$query, $expected]) {
        lookup($name . ' precedence', function() use ($shortcodes, $name, $query, $other) {
            $_GET = ['fp_color' => $query];
            return $shortcodes[$name](['color' => $other]);
        }, $expected);
    }
}

// Execute real error returns/rendering rather than throwing at SELECT.
$wpdb->missing = true;
foreach (['', null, [$id], (object)['color' => $id], 'FP::H55_L060_C085::X',
          'H055_FP:L060_C085', 'FP::H999_L999_C999::X', $full] as $input) {
    foreach (paths($input) as $path => $callback) {
        $result = invoke($callback);
        $calls++;
        if (str_starts_with($path, 'direct ') || str_starts_with($path, 'REST ')) {
            check(is_wp_error($result), true, $path . ': structured error');
            check($result->get_error_code(), 'arbe_color_not_found', $path . ': stable error code');
            check($result->get_error_data(), ['status' => 404], $path . ': stable HTTP status');
        } else {
            check(is_string($result), true, $path . ': rendered empty/error result');
            check(str_contains($result, 'not found') || str_contains($result, 'Missing FP-Color')
                || str_contains($result, 'Enter an FP-Color') || str_contains($result, 'Gib einen FP-Code'),
                true, $path . ': expected empty/error message');
        }
    }
}

// A synthetic successful solver run verifies the address/payload boundary.
// Only the reference lookup/solver orchestration is real; optimization, audit
// and certificate generation below are inert doubles, not scientific evidence.
define('ARBE_FP_SOLVER_VERSION', 'offline-candidate-test');
function arbe_fp_optimize_formula($color, $args) {
    check($color, $GLOBALS['wpdb']->colorFixture, 'optimizer receives stored row');
    $GLOBALS['seen_args'] = $args;
    return ['settings' => $args, 'solutions' => [], 'reference_curve' => []];
}
function arbe_fp_audit_log($event, $data) { $GLOBALS['audit_events'][] = [$event, $data]; }
function arbe_fp_certificate_payload($solve) {
    return ['test_only_reference' => $solve['fp_color']['id']];
}
$wpdb->colorFixture = (object)[
    'id' => 101, 'fp_color_id' => $id, 'color_name' => 'SYNTHETIC TEST ROW',
    'hex_value' => '#000000', 'source_status' => 'TEST_ONLY',
    'psf_p1_nm' => 400, 'psf_p1_r' => 0.1, 'psf_p2_nm' => 500, 'psf_p2_r' => 0.2,
    'psf_p3_nm' => 600, 'psf_p3_r' => 0.3, 'psf_p4_nm' => 700, 'psf_p4_r' => 0.4,
];
$args = ['top' => 3, 'kernel' => 'km', 'adaptive' => 0];
$audit_events = [];
$bare = arbe_fp_solve($id, $args);
$calls++;
foreach (['FP::' . $id . '::', $full, 'FP::' . $id . '::hex=#FFFFFF::signature=forged::' . $other] as $input) {
    $result = arbe_fp_solve($input, $args);
    $calls++;
    check($result, $bare, 'payload never supplies master/solver fields');
    check($seen_args, $args, 'solver settings are preserved');
    check($result['fp_color']['status'], 'TEST_ONLY', 'stored reference status is preserved');
    check(array_key_exists('payload_validated', $result), false, 'no invented payload validation claim');
}
check(count($audit_events), 4, 'existing solve audit is called once per synthetic success');
foreach ($audit_events as [$event, $data]) {
    check($event, 'solve', 'existing audit event');
    check($data['fp_color_id'], $id, 'audit binds stored reference');
}

echo 'PASS: ' . count($cases) . ' input cases; ' . $calls . ' entry-path calls; '
    . $checks . ' assertions; PHP ' . PHP_VERSION . "\n";
echo "Scope: address extraction and offline lookup/error paths; payload validation NOT PERFORMED.\n";
