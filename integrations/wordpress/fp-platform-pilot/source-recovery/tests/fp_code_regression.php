<?php
/** Offline characterization of the captured implementation, not a new parser.
 * Executes the saved PHP modules directly, with inert WordPress registration
 * and a recording database double that stops at the first SELECT lookup.
 * No plugin entry file, activation, imports, solver, audit or network is run.
 */
error_reporting(E_ALL);
set_error_handler(function ($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});
define('ABSPATH', __DIR__ . '/');
$source = dirname(__DIR__) . '/live-2026-10-09/source';
$shortcodes = [];
$actions = [];
$routes = [];
$checks = 0;

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
function register_rest_route($namespace, $path, $args) {
    $GLOBALS['routes'][$namespace . $path] = $args['callback'];
}
function shortcode_atts($defaults, $atts) { return array_merge($defaults, array_intersect_key($atts, $defaults)); }
function wp_parse_args($args, $defaults) { return array_merge($defaults, $args); }
function esc_attr($value) { return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8'); }
function esc_html($value) { return esc_attr($value); }
function esc_url($value) { return esc_attr($value); }
function add_query_arg($args) { return '/offline?' . http_build_query($args); }
function sanitize_text_field($value) { return trim(strip_tags((string)$value)); }
class WP_REST_Request {
    private array $params;
    public function __construct(array $params) { $this->params = $params; }
    public function get_param($name) { return $this->params[$name] ?? null; }
}
class LookupReached extends RuntimeException {}
class RecordingDatabase {
    public string $prefix = 'offline_';
    public array $lookups = [];
    public function prepare($sql, ...$args) { return ['sql' => $sql, 'args' => $args]; }
    public function get_row($query) {
        $this->lookups[] = $query;
        throw new LookupReached('Stopped before any database or pigment access');
    }
    public function __call($name, $args) { throw new RuntimeException('Unexpected DB operation: ' . $name); }
}
$wpdb = new RecordingDatabase();

// These files contain declarations/registrations only at top level. They are
// never replaced with a hand-translated regular expression in this test.
require $source . '/includes/database.php';
require $source . '/includes/solver.php';
require $source . '/includes/spectral-search.php';
require $source . '/includes/shortcodes.php';
require $source . '/includes/rest-api.php';
foreach ($actions['rest_api_init'] as $register) { $register(); }

$id = 'H055_L060_C085';
// Synthetic opaque payload: the literal full successful 2026-09-27 input was
// not preserved. These fields are NOT measured data, a certificate or a recipe.
$full = 'FP::H055_L060_C085::TEST_PAYLOAD=synthetic::UNVERIFIED=1';
$cases = [
    ['bare address', $id, $id],
    ['lowercase address', strtolower($id), $id],
    ['surrounding ASCII whitespace', " \t" . $id . "\r\n", $id],
    ['FP prefix without payload', 'FP::' . $id, $id],
    ['complete synthetic FP code', $full, $id],
    ['lowercase full code', strtolower($full), $id],
    ['full code with surrounding whitespace', "\t" . $full . "\n", $id],
    ['empty payload after delimiter', 'FP::' . $id . '::', $id],
    ['legacy single colon', 'FP:' . $id, $id],
    ['empty string', '', ''],
    ['null coerced to empty', null, ''],
    ['wrong width is not the target', 'FP::H55_L060_C085::X', ':H55_L060_C085::X'],
    ['missing payload delimiter', 'FP::' . $id . ':X', ':' . $id . ':X'],
    ['extra digit is not the target', 'FP::H055_L060_C0850::X', ':H055_L060_C0850::X'],
    ['embedded FP is not extracted', 'PREFIX FP::' . $id . '::X', 'PREFIX :' . $id . '::X'],
    ['first address wins', 'FP::' . $id . '::H095_L090_C105', $id],
    ['shape does not validate master membership', 'FP::H999_L999_C999::X', 'H999_L999_C999'],
    ['arbitrary tail is ignored', 'FP::' . $id . '::not-a-validated-payload', $id],
];
foreach ($cases as [$label, $input, $expected]) {
    check(arbe_fp_parse_color_query($input), $expected, $label);
}

function lookup($label, $callback, $expected) {
    global $wpdb;
    $wpdb->lookups = [];
    $level = ob_get_level();
    $reached = false;
    try { $callback(); }
    catch (LookupReached $e) { $reached = true; }
    finally { while (ob_get_level() > $level) { ob_end_clean(); } }
    check($reached, true, $label . ': reaches lookup');
    check(count($wpdb->lookups), 1, $label . ': one lookup');
    check($wpdb->lookups[0]['sql'], 'SELECT * FROM offline_arbe_fp_color_master WHERE fp_color_id=%s', $label . ': prepared equality SELECT');
    check($wpdb->lookups[0]['args'], [$expected], $label . ': bound reference');
}
foreach ([$id, $full, strtolower($full), " \t" . $full . "\n"] as $input) {
    $_GET = ['fp_color' => $input];
    lookup('public [arbe_fp] GET', fn() => $shortcodes['arbe_fp']([]), $id);
    lookup('[arbe_spectral_search] GET', fn() => $shortcodes['arbe_spectral_search']([]), $id);
    $_GET = [];
    lookup('public [arbe_fp] attribute', fn() => $shortcodes['arbe_fp'](['color' => $input]), $id);
    lookup('[arbe_spectral_search] attribute', fn() => $shortcodes['arbe_spectral_search'](['color' => $input]), $id);
    lookup('spectral-search function', fn() => arbe_fp_spectral_search($input), $id);
    lookup('registered REST spectral-search', fn() => $routes['arbe/v1/spectral-search'](new WP_REST_Request(['color' => $input])), $id);
}
$_GET = ['fp_color' => $full];
lookup('GET takes precedence over attribute', fn() => $shortcodes['arbe_fp'](['color' => 'H095_L090_C105']), $id);

// Record the real scope boundary: these direct legacy entry points do NOT
// extract FP:: payloads. Preserving that observation does not endorse it.
$_GET = [];
lookup('direct solver bare address', fn() => arbe_fp_solve($id), $id);
lookup('direct solver full-code limitation', fn() => arbe_fp_solve($full), strtoupper($full));
lookup('direct structural shortcode limitation', fn() => $shortcodes['arbe_fp_structural_solver'](['color' => $full]), strtoupper($full));
lookup('REST solve limitation', fn() => $routes['arbe/v1/solve'](new WP_REST_Request(['color' => $full])), strtoupper($full));

$_GET = [];
$wpdb->lookups = [];
$empty = $shortcodes['arbe_fp']([]);
check(count($wpdb->lookups), 0, 'empty form performs no lookup');
check(str_contains($empty, 'FP-Code / FP-Color ID'), true, 'empty public form rendered');
echo 'PASS: ' . count($cases) . ' parser cases; 29 entry-path checks; ' . $checks . " assertions; PHP " . PHP_VERSION . "\n";
echo "Scope: captured PHP to prepared reference lookup; no live DB, spectral computation, audit, import or payload authentication.\n";
