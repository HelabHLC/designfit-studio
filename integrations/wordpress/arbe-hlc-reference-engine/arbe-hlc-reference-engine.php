<?php
/**
 * Plugin Name: ARBE HLC Reference Engine
 * Plugin URI: https://example.com/
 * Description: Atlas-only nearest-match engine for WordPress with MySQL-backed runtime master, guided installation, REST matching, and one validated Hxxx_Lxxx_Cxxx output.
 * Version: 0.1.6
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Author: OpenAI
 * License: GPL-2.0-or-later
 * Text Domain: arbe-hlc-reference-engine
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ARBE_HLC_PLUGIN_VERSION', '0.1.6');
define('ARBE_HLC_PLUGIN_FILE', __FILE__);
define('ARBE_HLC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ARBE_HLC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('ARBE_HLC_MASTER_VERSION', 'runtime_master_mysql_v1');

require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-db.php';
require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-importer.php';
require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-matcher.php';
require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-rest.php';
require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-shortcode.php';
require_once ARBE_HLC_PLUGIN_DIR . 'includes/class-arbe-hlc-admin.php';

register_activation_hook(__FILE__, ['ARBE_HLC_DB', 'activate']);
register_deactivation_hook(__FILE__, ['ARBE_HLC_DB', 'deactivate']);

add_action('plugins_loaded', function () {
    ARBE_HLC_DB::maybe_upgrade();
    ARBE_HLC_REST::init();
    ARBE_HLC_Shortcode::init();

    if (is_admin()) {
        ARBE_HLC_Admin::init();
    }
});

add_filter('plugin_action_links_' . plugin_basename(__FILE__), function ($links) {
    $url = admin_url('admin.php?page=arbe-hlc-reference-engine');
    array_unshift($links, '<a href="' . esc_url($url) . '">Installer</a>');
    return $links;
});
