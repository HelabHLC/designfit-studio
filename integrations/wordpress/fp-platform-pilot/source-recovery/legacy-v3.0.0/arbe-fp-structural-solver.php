<?php
/**
 * Plugin Name: ARBE FP Structural Solver
 * Description: FP-Code to pigment formula solver with measured reference curves, Kubelka-Munk K/S mixing, SCISSOR validation, confidence scoring, production fix release with stable certificate registry, QR verification, raw HTML print export and REST API.
 * Version: 3.0.0
 * Author: ARBE λ*
 * Requires PHP: 8.1
 *
 * Shortcodes:
 * [arbe_fp_structural_solver color="H095_L090_C105"]
 * [arbe_fp_solver_result color="H095_L090_C105"]
 * [arbe_fp_solver_card color="H095_L090_C105"]
 * [arbe_fp_certificate color="H095_L090_C105"]
 * [arbe_fp_certificate_json color="H095_L090_C105"]
 * [arbe_fp_verify_certificate id="ARBE-FP-..."]
 * [arbe_fp_registry_lookup]
 */

if (!defined('ABSPATH')) { exit; }

define('ARBE_FP_SOLVER_VERSION', '3.0.0');
define('ARBE_FP_SOLVER_PATH', plugin_dir_path(__FILE__));
define('ARBE_FP_SOLVER_URL', plugin_dir_url(__FILE__));

require_once ARBE_FP_SOLVER_PATH . 'includes/database.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/scissor.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/formula-engine.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/confidence.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/certificate.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/optimizer.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/solver.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/rest-api.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/admin.php';
require_once ARBE_FP_SOLVER_PATH . 'includes/shortcodes.php';

register_activation_hook(__FILE__, function() {
    arbe_fp_solver_create_tables();
    arbe_fp_solver_seed_color_master();
});

add_action('wp_enqueue_scripts', 'arbe_fp_solver_assets');
add_action('admin_enqueue_scripts', 'arbe_fp_solver_assets');

function arbe_fp_solver_assets() {
    wp_register_style('arbe-fp-solver-css', ARBE_FP_SOLVER_URL . 'assets/arbe-fp-solver.css', [], ARBE_FP_SOLVER_VERSION);
    wp_register_script('chartjs', 'https://cdn.jsdelivr.net/npm/chart.js', [], '4.4.1', true);
    wp_register_script('arbe-fp-solver-js', ARBE_FP_SOLVER_URL . 'assets/arbe-fp-solver.js', ['chartjs'], ARBE_FP_SOLVER_VERSION, true);
    wp_enqueue_style('arbe-fp-solver-css');
    wp_enqueue_script('chartjs');
    wp_enqueue_script('arbe-fp-solver-js');
}
?>