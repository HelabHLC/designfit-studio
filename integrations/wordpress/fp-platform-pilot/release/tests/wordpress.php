<?php
/** Runs real WordPress/SQL/plugin code, exclusively in the isolated fixture site. */
$phase = getenv('FP_ACCEPTANCE_PHASE');
$wp_root = getenv('FP_WP_ROOT');
$report = getenv('FP_REPORT_DIR');
if (!$wp_root || !$report || !in_array($phase, ['install', 'baseline', 'upgrade', 'accept', 'reactivate', 'rollback', 'rollback-check', 'fresh'], true)) {
    throw new RuntimeException('Explicit isolated acceptance environment required');
}
if (in_array($phase, ['install', 'fresh'], true)) { define('WP_INSTALLING', true); }
require $wp_root . '/wp-load.php';
if (!defined('ARBE_FP_ISOLATED_ACCEPTANCE') || ARBE_FP_ISOLATED_ACCEPTANCE !== true
    || DB_NAME !== 'arbe_fp_acceptance' || !in_array($table_prefix, ['fptest_', 'fpfresh_'], true)
    || parse_url(home_url(), PHP_URL_HOST) !== '127.0.0.1') {
    throw new RuntimeException('Refusing a non-fixture WordPress installation');
}
require_once ABSPATH . 'wp-admin/includes/plugin.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
$plugin = 'arbe-fp-structural-solver/arbe-fp-structural-solver.php';
$checks = 0;
function ok($condition, $label) {
    global $checks, $wpdb;
    if (!$condition) { throw new RuntimeException($label . '; DB: ' . $wpdb->last_error); }
    $checks++;
}
function save_json($name, $data) {
    file_put_contents(getenv('FP_REPORT_DIR') . '/' . $name . '.json', json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
}
function state() {
    return json_decode(file_get_contents(getenv('FP_REPORT_DIR') . '/fixture-state.json'), true);
}
function protected_fingerprint() {
    global $wpdb;
    $result = [];
    foreach (['fp_color_master', 'fp_color_curves', 'fp_pigments', 'fp_pigment_curves',
              'fp_pigment_sources', 'hlc_acquisition_targets', 'material_candidates', 'pigment_candidates'] as $suffix) {
        $table = $wpdb->prefix . 'arbe_' . $suffix;
        $rows = $wpdb->get_results("SELECT * FROM $table ORDER BY id", ARRAY_A);
        ok($wpdb->last_error === '', 'read protected table ' . $suffix);
        $result[$suffix] = ['rows' => count($rows), 'sha256' => hash('sha256', json_encode($rows))];
    }
    return $result;
}
function solve_options() { return ['top'=>3, 'max_candidates'=>3, 'max_components'=>2, 'step'=>25, 'adaptive'=>0, 'kernel'=>'km']; }
function numerical_solve($result) {
    ok(!is_wp_error($result) && !empty($result['solutions']), 'actual solver returned solutions');
    unset($result['version'], $result['certificate']);
    // JSON canonicalization makes numeric values stable across process boundaries.
    return json_decode(json_encode($result), true);
}
function install_zip($zip, $overwrite) {
    $skin = new Automatic_Upgrader_Skin();
    $upgrader = new Plugin_Upgrader($skin);
    $result = $upgrader->install($zip, ['overwrite_package'=>$overwrite, 'clear_update_cache'=>false]);
    ok($result === true, 'native WordPress ZIP install/replace: ' . wp_json_encode($skin->get_upgrade_messages()));
}

if ($phase === 'install' || $phase === 'fresh') {
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    ok(!is_blog_installed(), 'fixture database prefix is empty');
    $result = wp_install('FP Platform isolated acceptance', 'fixture-admin', 'fixture@example.invalid', false,
        '', 'fixture-only-not-a-real-credential');
    ok(!is_wp_error($result), 'WordPress installed');
    wp_set_current_user($result['user_id']);
    update_option('blog_public', 0);
    if ($phase === 'install') {
        install_zip(getenv('FP_BASELINE_ZIP'), false);
    } else {
        install_zip(getenv('FP_RELEASE_ZIP'), true);
        ok(activate_plugin($plugin) === null, 'fresh release activation');
        ok(ARBE_FP_SOLVER_VERSION === '5.2.1-rc1', 'fresh runtime version');
        ok(get_option('arbe_fp_platform_schema_version') === '5.2.0', 'fresh schema revision');
        ok(arbe_fp_solver_counts()['colors'] === 2, 'fresh installation retains the existing demo seeding behavior');
    }
} else {
    wp_set_current_user(1);
    if ($phase === 'baseline') {
        ok(activate_plugin($plugin) === null, 'baseline activation');
        ok(ARBE_FP_SOLVER_VERSION === '5.2.0', 'actual baseline runtime');
        // All fixture values below are synthetic, never production master data.
        $wpdb->delete($wpdb->prefix . 'arbe_fp_color_master', ['fp_color_id'=>'H095_L090_C105']);
        $wpdb->insert($wpdb->prefix . 'arbe_fp_color_master', [
            'fp_color_id'=>'H055_L060_C085', 'color_name'=>'SYNTHETIC ACCEPTANCE FIXTURE',
            'hex_value'=>'#000000', 'source_status'=>'TEST_ONLY',
            'psf_p1_nm'=>400, 'psf_p1_r'=>0.22, 'psf_p2_nm'=>500, 'psf_p2_r'=>0.32,
            'psf_p3_nm'=>600, 'psf_p3_r'=>0.42, 'psf_p4_nm'=>700, 'psf_p4_r'=>0.52,
        ]);
        ok($wpdb->last_error === '', 'insert synthetic reference');
        $color_id = $wpdb->insert_id;
        for ($i=0; $i<36; $i++) {
            $wpdb->insert($wpdb->prefix . 'arbe_fp_color_curves', [
                'color_id'=>$color_id, 'wavelength_nm'=>380+10*$i, 'remission'=>0.2+0.01*$i, 'curve_status'=>'TEST_ONLY',
            ]);
        }
        for ($j=1; $j<=3; $j++) {
            $curve = [];
            for ($i=0; $i<36; $i++) { $curve[380+10*$i] = 0.08*$j + 0.008*$i; }
            $wpdb->insert($wpdb->prefix . 'arbe_fp_pigments', [
                'pigment_code'=>'TEST_'.$j, 'pigment_name'=>'SYNTHETIC '.$j, 'curve_status'=>'TEST_ONLY',
                'psf_p1_nm'=>400, 'psf_p1_r'=>$curve[400], 'psf_p2_nm'=>500, 'psf_p2_r'=>$curve[500],
                'psf_p3_nm'=>600, 'psf_p3_r'=>$curve[600], 'psf_p4_nm'=>700, 'psf_p4_r'=>$curve[700],
            ]);
            $pigment_id = $wpdb->insert_id;
            foreach ($curve as $nm=>$r) { $wpdb->insert($wpdb->prefix . 'arbe_fp_pigment_curves', ['pigment_id'=>$pigment_id, 'wavelength_nm'=>$nm, 'remission'=>$r]); }
        }
        $pages = [];
        foreach (['arbe_fp', 'arbe_spectral_search', 'arbe_fp_structural_solver'] as $tag) {
            $pages[$tag] = wp_insert_post(['post_type'=>'page', 'post_status'=>'publish', 'post_title'=>'TEST ONLY '.$tag,
                'post_content'=>'['.$tag.']']);
        }
        $solve = arbe_fp_solve('H055_L060_C085', solve_options());
        ok($solve['reference_mode'] === 'measured_full_curve', 'fixture curve path is exercised');
        ok(is_wp_error(arbe_fp_solve('FP::H055_L060_C085::SYNTHETIC')), 'baseline full-code solve limitation reproduced');
        $search = arbe_fp_spectral_search('H055_L060_C085', ['limit'=>3]);
        ok(!is_wp_error($search) && count($search['results']) === 3, 'actual spectral ranking');
        save_json('fixture-state', ['protected'=>protected_fingerprint(), 'solve'=>numerical_solve($solve),
            'search'=>$search, 'pages'=>$pages, 'wp'=>get_bloginfo('version'), 'php'=>PHP_VERSION]);
    } elseif ($phase === 'upgrade' || $phase === 'rollback') {
        install_zip(getenv($phase === 'upgrade' ? 'FP_RELEASE_ZIP' : 'FP_BASELINE_ZIP'), true);
        ok(is_plugin_active($plugin), 'native ZIP replacement retains active plugin');
        ok(protected_fingerprint() === state()['protected'], 'native replacement preserves reference and pigment data');
    } elseif ($phase === 'accept' || $phase === 'reactivate') {
        ok(ARBE_FP_SOLVER_VERSION === '5.2.1-rc1', 'upgraded runtime loaded in a fresh request');
        ok(get_option('arbe_fp_platform_version') === '5.2.1-rc1', 'runtime option advanced');
        ok(get_option('arbe_fp_platform_schema_version') === '5.2.0', 'schema revision did not advance');
        ok(protected_fingerprint() === state()['protected'], 'upgrade bootstrap did not alter protected data');
        if ($phase === 'reactivate') {
            deactivate_plugins($plugin);
            ok(activate_plugin($plugin) === null, 'reactivation succeeds');
            ok(protected_fingerprint() === state()['protected'], 'reactivation does not seed the deleted demo reference');
        } else {
            $valid = ['H055_L060_C085', 'fp:h055_l060_c085', 'FP::H055_L060_C085',
                'FP::H055_L060_C085::SYNTHETIC', 'FP::H055_L060_C085::',
                'FP::H055_L060_C085::signature=forged::H095_L090_C105', " \tfp::h055_l060_c085::x\n"];
            foreach ($valid as $input) {
                ok(numerical_solve(arbe_fp_solve($input, solve_options())) === state()['solve'], 'solver numerics match 5.2.0 bare address');
                ok(json_decode(json_encode(arbe_fp_spectral_search($input, ['limit'=>3])), true) === state()['search'], 'search numerics match baseline');
                foreach (['solve', 'spectral-search', 'certificate'] as $route) {
                    $request = new WP_REST_Request('GET', '/arbe/v1/' . $route);
                    $request->set_query_params(['color'=>$input] + solve_options());
                    $response = rest_do_request($request);
                    ok($response->get_status() === 200, 'real REST dispatcher accepts '.$route);
                    $data = $response->get_data();
                    $resolved = $route === 'certificate' ? $data['reference']['fp_color_id'] : $data['fp_color']['id'];
                    ok($resolved === 'H055_L060_C085', 'real REST uses reference address');
                }
                foreach (['arbe_fp','arbe_spectral_search','arbe_fp_structural_solver','arbe_fp_solver_result',
                          'arbe_fp_solver_card','arbe_fp_certificate','arbe_fp_certificate_json'] as $tag) {
                    $_GET = ['fp_color'=>$input];
                    $html = do_shortcode('['.$tag.']');
                    ok(str_contains($html, 'H055_L060_C085') && !str_contains($html, 'FP-Color not found'), 'real shortcode GET '.$tag);
                    $_GET = [];
                    $html = do_shortcode('['.$tag.' color="'.esc_attr($input).'"]');
                    ok(str_contains($html, 'H055_L060_C085') && !str_contains($html, 'FP-Color not found'), 'real shortcode attribute '.$tag);
                }
            }
            foreach (['', ['H055_L060_C085'], 'FP::H55_L060_C085::X', 'FP::H055_L060_C085:X',
                      'H055_FP:L060_C085', 'FP:FP::H055_L060_C085::X', 'FP::H999_L999_C999::X'] as $input) {
                foreach (['solve','spectral-search','certificate'] as $route) {
                    $request = new WP_REST_Request('GET', '/arbe/v1/'.$route);
                    $request->set_query_params(['color'=>$input]);
                    $response = rest_do_request($request);
                    ok($response->get_status() === 404, 'real REST rejects unknown/malformed key '.$route);
                    ok($response->get_data()['code'] === 'arbe_color_not_found', 'stable REST error');
                }
                $_GET = ['fp_color'=>$input];
                ok(is_string(do_shortcode('[arbe_fp]')) && is_string(do_shortcode('[arbe_fp_structural_solver]')), 'malformed form input renders without fatal');
                $_GET = [];
            }
            ok(protected_fingerprint() === state()['protected'], 'all functional tests preserve protected data');
            ok(arbe_fp_solver_counts()['audit_events'] > 2, 'real audit writes stay in isolated fixture DB');
        }
    } elseif ($phase === 'rollback-check') {
        ok(ARBE_FP_SOLVER_VERSION === '5.2.0', 'file rollback loads original runtime');
        ok(protected_fingerprint() === state()['protected'], 'rollback preserves protected data');
        ok(numerical_solve(arbe_fp_solve('H055_L060_C085', solve_options())) === state()['solve'], 'rollback restores original numerical output');
    }
}
save_json($phase, ['phase'=>$phase, 'status'=>'PASS', 'assertions'=>$checks,
    'wp'=>get_bloginfo('version'), 'php'=>PHP_VERSION, 'database'=>$wpdb->db_version(),
    'plugin_version'=>defined('ARBE_FP_SOLVER_VERSION') ? ARBE_FP_SOLVER_VERSION : null,
    'scope'=>'Isolated synthetic fixture only; not production-site acceptance or payload authentication']);
echo "PASS: native WordPress $phase; $checks assertions; PHP " . PHP_VERSION . "\n";
