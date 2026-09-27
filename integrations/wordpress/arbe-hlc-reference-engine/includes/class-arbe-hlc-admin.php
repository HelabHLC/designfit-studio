<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_Admin {
    public static function init(): void {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'assets']);
        add_action('wp_ajax_arbe_hlc_install_reset', [__CLASS__, 'ajax_reset']);
        add_action('wp_ajax_arbe_hlc_install_chunk', [__CLASS__, 'ajax_chunk']);
        add_action('admin_notices', [__CLASS__, 'notice']);
    }

    public static function menu(): void {
        add_menu_page(
            'ARBE HLC Reference Engine',
            'ARBE HLC',
            'manage_options',
            'arbe-hlc-reference-engine',
            [__CLASS__, 'render_page'],
            'dashicons-art',
            58
        );
    }

    public static function assets(string $hook): void {
        if ($hook !== 'toplevel_page_arbe-hlc-reference-engine') {
            return;
        }

        wp_enqueue_style(
            'arbe-hlc-admin',
            ARBE_HLC_PLUGIN_URL . 'assets/css/frontend.css',
            [],
            ARBE_HLC_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'arbe-hlc-admin',
            ARBE_HLC_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery'],
            ARBE_HLC_PLUGIN_VERSION,
            true
        );

        wp_localize_script('arbe-hlc-admin', 'ARBE_HLC_ADMIN', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('arbe_hlc_install'),
            'totalRows' => ARBE_HLC_Importer::total_rows(),
            'installState' => get_option('arbe_hlc_install_state', 'pending'),
            'currentOffset' => (int) get_option('arbe_hlc_import_offset', 0),
            'currentRows' => ARBE_HLC_DB::count_rows(),
            'chunkSize' => 100,
        ]);
    }

    public static function notice(): void {
        if (!current_user_can('manage_options')) {
            return;
        }
        $screen = get_current_screen();
        if ($screen && $screen->id === 'toplevel_page_arbe-hlc-reference-engine') {
            return;
        }
        if (ARBE_HLC_DB::is_ready()) {
            return;
        }
        $url = admin_url('admin.php?page=arbe-hlc-reference-engine');
        echo '<div class="notice notice-warning"><p><strong>ARBE HLC Reference Engine:</strong> runtime master not installed yet. <a href="' . esc_url($url) . '">Open guided installer</a>.</p></div>';
    }

    public static function render_page(): void {
        $state = get_option('arbe_hlc_install_state', 'pending');
        $error = get_option('arbe_hlc_import_error', '');
        $rows = ARBE_HLC_DB::count_rows();
        $total = ARBE_HLC_Importer::total_rows();
        $offset = (int) get_option('arbe_hlc_import_offset', 0);
        $health = ARBE_HLC_Matcher::health();
        ?>
        <div class="wrap">
            <h1>ARBE HLC Reference Engine</h1>
            <p>Guided installer for the MySQL runtime master. Activation creates the SQL table. This installer imports the packaged runtime master into WordPress and enables the atlas-only match endpoint.</p>

            <div class="arbe-hlc-admin-grid">
                <div class="arbe-hlc-admin-card">
                    <h2>Install status</h2>
                    <ul>
                        <li><strong>State:</strong> <span id="arbe-install-state"><?php echo esc_html($state); ?></span></li>
                        <li><strong>Imported rows:</strong> <span id="arbe-imported-rows"><?php echo esc_html((string) $rows); ?></span> / <span id="arbe-total-rows"><?php echo esc_html((string) $total); ?></span></li>
                        <li><strong>Resume offset:</strong> <span id="arbe-current-offset"><?php echo esc_html((string) $offset); ?></span></li>
                        <li><strong>Master version:</strong> <?php echo esc_html($health['master_version']); ?></li>
                        <li><strong>REST health:</strong> <code><?php echo esc_html(rest_url('arbe-hlc-reference/v1/health')); ?></code></li>
                        <li><strong>REST match:</strong> <code><?php echo esc_html(rest_url('arbe-hlc-reference/v1/match')); ?></code></li>
                        <li><strong>Shortcode:</strong> <code>[arbe_hlc_reference_tool]</code></li>
                    </ul>
                    <?php if ($error) : ?>
                        <div class="notice notice-error inline"><p><?php echo esc_html($error); ?></p></div>
                    <?php endif; ?>
                    <div class="arbe-hlc-progress">
                        <div class="arbe-hlc-progress-bar" id="arbe-progress-bar" style="width: <?php echo $total > 0 ? esc_attr((string) round(($rows / $total) * 100)) : '0'; ?>%;"></div>
                    </div>
                    <p id="arbe-progress-text"><?php echo esc_html($rows . ' of ' . $total . ' rows imported'); ?></p>
                    <p>
                        <button class="button button-primary" id="arbe-run-installer">Run guided installation</button>
                        <button class="button" id="arbe-reset-installer">Reset and reinstall</button>
                    </p>
                </div>

                <div class="arbe-hlc-admin-card">
                    <h2>Installation flow</h2>
                    <ol>
                        <li>Create MySQL table on activation.</li>
                        <li>Import packaged runtime master in AJAX batches.</li>
                        <li>Enable REST health and match endpoints.</li>
                        <li>Use the shortcode on any page to expose the request UI.</li>
                    </ol>
                    <p><strong>Atlas-only note:</strong> this package imports only valid <code>Hxxx_Lxxx_Cxxx</code> rows with <code>lambda_v2_method = Brent</code>.</p>
                </div>
            </div>
        </div>
        <?php
    }


private static function begin_ajax(): void {
    nocache_headers();
    if (function_exists('ini_set')) {
        @ini_set('display_errors', '0');
    }
    while (ob_get_level() > 0) {
        @ob_end_clean();
    }
    ob_start();
}

private static function send_json_clean(bool $success, array $payload, int $status_code = 200): void {
    $buffer = '';
    if (ob_get_level() > 0) {
        $buffer = trim((string) ob_get_clean());
    }
    if ($buffer !== '') {
        $payload['debug_output'] = mb_substr($buffer, 0, 1200);
    }
    if ($success) {
        wp_send_json_success($payload, $status_code);
    }
    wp_send_json_error($payload, $status_code);
}

    public static function ajax_reset(): void {
        self::begin_ajax();
        self::guard();
        ARBE_HLC_Importer::reset();
        self::send_json_clean(true, [
            'state' => 'pending',
            'rows' => 0,
            'total' => ARBE_HLC_Importer::total_rows(),
        ]);
    }

    public static function ajax_chunk(): void {
        self::begin_ajax();
        self::guard();
        $offset = isset($_POST['offset']) ? (int) $_POST['offset'] : -1;
        $limit = isset($_POST['limit']) ? max(50, min(500, (int) $_POST['limit'])) : 200;
        $result = ARBE_HLC_Importer::import_chunk($offset, $limit);

        if (!empty($result['error'])) {
            self::send_json_clean(false, [
                'state' => get_option('arbe_hlc_install_state', 'error'),
                'rows' => ARBE_HLC_DB::count_rows(),
                'total' => $result['total'] ?? ARBE_HLC_Importer::total_rows(),
                'done' => true,
                'offset' => (int) get_option('arbe_hlc_import_offset', 0),
                'message' => $result['message'] ?? 'Import error',
            ], 500);
        }

        self::send_json_clean(true, [
            'state' => get_option('arbe_hlc_install_state', 'pending'),
            'rows' => ARBE_HLC_DB::count_rows(),
            'total' => $result['total'],
            'done' => $result['done'],
            'offset' => $result['offset'],
            'message' => $result['message'],
        ]);
    }

    private static function guard(): void {
        if (!current_user_can('manage_options')) {
            self::send_json_clean(false, ['message' => 'Forbidden'], 403);
        }
        check_ajax_referer('arbe_hlc_install', 'nonce');
    }
}
