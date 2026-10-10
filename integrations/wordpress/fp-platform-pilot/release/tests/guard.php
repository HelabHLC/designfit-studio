<?php
// Copied ONLY into the disposable test site's mu-plugins directory.
if (!defined('ARBE_FP_ISOLATED_ACCEPTANCE') || ARBE_FP_ISOLATED_ACCEPTANCE !== true) {
    throw new RuntimeException('Acceptance guard requires isolated test configuration');
}
add_filter('pre_wp_mail', '__return_true');
add_filter('query', function ($query) {
    $phase = getenv('FP_ACCEPTANCE_PHASE');
    if (!in_array($phase, ['install', 'baseline', 'fresh'], true)
        && preg_match('/^\s*(CREATE|ALTER|DROP|INSERT|REPLACE|UPDATE|DELETE|TRUNCATE)\b/i', $query)
        && preg_match('/\bfptest_arbe_(fp_color_master|fp_color_curves|fp_pigments|fp_pigment_curves|fp_pigment_sources|hlc_acquisition_targets|material_candidates|pigment_candidates)\b/i', $query)) {
        throw new RuntimeException('Unexpected protected-table write during ' . $phase . ': ' . $query);
    }
    return $query;
});
set_error_handler(function ($severity, $message, $file, $line) {
    if (str_contains($file, '/plugins/arbe-fp-structural-solver/')) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
    return false;
});
