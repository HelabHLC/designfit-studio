<?php
if (!defined('ABSPATH')) { exit; }

add_shortcode('arbe_fp_structural_solver', 'arbe_fp_structural_solver_shortcode');
add_shortcode('arbe_fp_solver_result', 'arbe_fp_structural_solver_shortcode');

function arbe_fp_structural_solver_shortcode($atts) {
    $atts = shortcode_atts([
        'color'=>'',
        'top'=>'10',
        'max_candidates'=>'7',
        'max_components'=>'3',
        'step'=>'10',
        'adaptive'=>'1',
        'kernel'=>'km',
    ], $atts);

    $requested = strtoupper(trim($_GET['fp_color'] ?? $atts['color']));
    $args = [
        'top'=>intval($atts['top']),
        'max_candidates'=>intval($atts['max_candidates']),
        'max_components'=>intval($atts['max_components']),
        'step'=>intval($atts['step']),
        'adaptive'=>intval($atts['adaptive']),
        'kernel'=>sanitize_text_field($atts['kernel']),
    ];

    ob_start();
    echo '<section class="arbe-solver">';
    echo '<span class="arbe-kicker">ARBE FP Structural Solver v3.0</span>';
    echo '<h2>FP-Code → Best Structural Formula</h2>';
    echo '<form method="get" class="arbe-form"><label>FP-Color ID<input name="fp_color" value="'.esc_attr($requested).'" placeholder="H095_L090_C105"></label><button type="submit">Solve Structure</button></form>';

    if (!$requested) {
        echo '<p class="arbe-note">Enter an FP-Color ID. Example: <code>H095_L090_C105</code></p>';
        echo '</section>';
        return ob_get_clean();
    }

    $result = arbe_fp_solve($requested, $args);
    if (is_wp_error($result)) {
        echo '<div class="arbe-error">'.esc_html($result->get_error_message()).'</div></section>';
        return ob_get_clean();
    }

    echo arbe_fp_render_solver_result($result);
    echo '</section>';
    return ob_get_clean();
}

function arbe_fp_render_solver_result($result) {
    $color = $result['fp_color'];
    $solutions = $result['solutions'];
    $ref_curve = $result['reference_curve'];

    ob_start();
    echo '<div class="arbe-card">';
    echo '<div><span class="arbe-kicker">Reference</span><h3>'.esc_html($color['id']).'</h3><p>'.esc_html($color['name']).'</p></div>';
    if (!empty($color['hex'])) echo '<div class="arbe-swatch" style="background:'.esc_attr($color['hex']).'"></div>';
    echo '<p><strong>4PSF:</strong> <code>';
    $psf_parts=[]; foreach ($color['psf'] as $p) $psf_parts[] = intval($p['nm']).':'.number_format($p['r'],4,'.','');
    echo esc_html(implode(' | ', $psf_parts));
    echo '</code></p><p><strong>Reference curve:</strong> <code>'.esc_html($result['reference_mode'] ?? '4psf_reconstructed').'</code></p></div>';

    if (!$solutions) {
        echo '<div class="arbe-error">No solution available. Seed or import pigment curves first.</div>';
        return ob_get_clean();
    }

    $best = $solutions[0];
    $grade = $best['confidence']['confidence_grade'] ?? 'n/a';
    $confidence = $best['confidence']['confidence_score'] ?? 0;
    $label = arbe_fp_formula_label($best['formula']);
    [$match_label, $match_class] = arbe_fp_match_label($best['similarity']);

    echo '<div class="arbe-best">';
    echo '<span class="arbe-kicker">Best Formula Found</span>';
    echo '<h3>'.esc_html($label).'</h3>';
    echo '<div class="arbe-metric-row"><div><b>Structural Similarity</b><strong>'.esc_html(number_format($best['similarity'],2)).'%</strong></div><div><b>Confidence</b><strong>'.esc_html($grade).' / '.esc_html(number_format($confidence,1)).'%</strong></div><div><b>SCISSOR</b><strong>'.esc_html(number_format($best['scissor'],4)).'</strong></div><div><b>Mixing Kernel</b><strong>'.esc_html(strtoupper($best['kernel'] ?? 'km')).'</strong></div></div>';
    echo '<p><span class="arbe-chip arbe-chip-'.esc_attr($match_class).'">'.esc_html($match_label).'</span></p>';
    echo '</div>';

    echo '<h3>Top Formula Candidates</h3>';
    echo '<table class="arbe-table"><thead><tr><th>Rank</th><th>Formula</th><th>Type</th><th>Similarity</th><th>Confidence</th><th>SCISSOR</th><th>RMSE</th></tr></thead><tbody>';
    $rank=1;
    foreach ($solutions as $s) {
        echo '<tr><td>'.intval($rank++).'</td><td><code>'.esc_html(arbe_fp_formula_label($s['formula'])).'</code></td><td>'.esc_html($s['type']).'</td><td><strong>'.esc_html(number_format($s['similarity'],2)).'%</strong></td><td>'.esc_html($s['confidence']['confidence_grade']).' / '.esc_html(number_format($s['confidence']['confidence_score'],1)).'%</td><td>'.esc_html(number_format($s['scissor'],4)).'</td><td>'.esc_html(number_format($s['rmse'],4)).'</td></tr>';
    }
    echo '</tbody></table>';

    $chart_id = 'arbe_solver_chart_' . wp_rand(1000,999999);
    echo '<div class="arbe-chart"><canvas id="'.esc_attr($chart_id).'" height="130"></canvas></div>';
    echo '<script type="application/json" class="arbe-chart-data" data-chart-id="'.esc_attr($chart_id).'">'.wp_json_encode([
        'labels'=>array_values(array_keys($ref_curve)),
        'a_label'=>'FP-Color Reference',
        'b_label'=>'Best Formula',
        'a'=>array_values($ref_curve),
        'b'=>array_values($best['curve']),
    ]).'</script>';

    echo '<p class="arbe-note"><strong>Production note:</strong> v1.4 uses Kubelka-Munk K/S mixing by default and can generate a local certificate. Measured full reference curves are still preferable to 4PSF reconstruction.</p>';
    echo arbe_fp_render_certificate($result);

    return ob_get_clean();
}

add_shortcode('arbe_fp_solver_card', function($atts) {
    $atts = shortcode_atts([
        'color'=>'',
        'top'=>'10',
        'max_candidates'=>'7',
        'max_components'=>'3',
        'step'=>'10',
        'adaptive'=>'1',
        'kernel'=>'km',
    ], $atts);

    $requested = strtoupper(trim($_GET['fp_color'] ?? $atts['color']));
    if (!$requested) return '<div class="arbe-error">Missing FP-Color ID.</div>';

    $result = arbe_fp_solve($requested, [
        'top'=>intval($atts['top']),
        'max_candidates'=>intval($atts['max_candidates']),
        'max_components'=>intval($atts['max_components']),
        'step'=>intval($atts['step']),
        'adaptive'=>intval($atts['adaptive']),
        'kernel'=>sanitize_text_field($atts['kernel']),
    ]);

    if (is_wp_error($result)) return '<div class="arbe-error">'.esc_html($result->get_error_message()).'</div>';
    if (empty($result['solutions'])) return '<div class="arbe-error">No solver result available.</div>';

    $best = $result['solutions'][0];
    $label = arbe_fp_formula_label($best['formula']);
    $grade = $best['confidence']['confidence_grade'] ?? 'n/a';
    $conf = $best['confidence']['confidence_score'] ?? 0;
    [$match_label, $match_class] = arbe_fp_match_label($best['similarity']);

    ob_start();
    echo '<section class="arbe-solver arbe-compact">';
    echo '<span class="arbe-kicker">Best Structural Formula</span>';
    echo '<h3>'.esc_html($result['fp_color']['id']).'</h3>';
    echo '<div class="arbe-best">';
    echo '<h3>'.esc_html($label).'</h3>';
    echo '<div class="arbe-metric-row">';
    echo '<div><b>Similarity</b><strong>'.esc_html(number_format($best['similarity'],2)).'%</strong></div>';
    echo '<div><b>Confidence</b><strong>'.esc_html($grade).' / '.esc_html(number_format($conf,1)).'%</strong></div>';
    echo '<div><b>SCISSOR</b><strong>'.esc_html(number_format($best['scissor'],4)).'</strong></div>';
    echo '</div>';
    echo '<p><span class="arbe-chip arbe-chip-'.esc_attr($match_class).'">'.esc_html($match_label).'</span></p>';
    echo '</div></section>';
    return ob_get_clean();
});

add_shortcode('arbe_fp_certificate', function($atts) {
    $atts = shortcode_atts([
        'color'=>'',
        'top'=>'10',
        'max_candidates'=>'7',
        'max_components'=>'3',
        'step'=>'10',
        'adaptive'=>'1',
        'kernel'=>'km',
    ], $atts);

    $requested = strtoupper(trim($_GET['fp_color'] ?? $atts['color']));
    if (!$requested) return '<div class="arbe-error">Missing FP-Color ID.</div>';

    $result = arbe_fp_solve($requested, [
        'top'=>intval($atts['top']),
        'max_candidates'=>intval($atts['max_candidates']),
        'max_components'=>intval($atts['max_components']),
        'step'=>intval($atts['step']),
        'adaptive'=>intval($atts['adaptive']),
        'kernel'=>sanitize_text_field($atts['kernel']),
    ]);

    if (is_wp_error($result)) return '<div class="arbe-error">'.esc_html($result->get_error_message()).'</div>';
    return '<section class="arbe-solver">'.arbe_fp_render_certificate($result).'</section>';
});

add_shortcode('arbe_fp_certificate_json', function($atts) {
    $atts = shortcode_atts([
        'color'=>'',
        'top'=>'10',
        'max_candidates'=>'7',
        'max_components'=>'3',
        'step'=>'10',
        'adaptive'=>'1',
        'kernel'=>'km',
    ], $atts);

    $requested = strtoupper(trim($_GET['fp_color'] ?? $atts['color']));
    if (!$requested) return '<pre>{ "error": "Missing FP-Color ID" }</pre>';

    $result = arbe_fp_solve($requested, [
        'top'=>intval($atts['top']),
        'max_candidates'=>intval($atts['max_candidates']),
        'max_components'=>intval($atts['max_components']),
        'step'=>intval($atts['step']),
        'adaptive'=>intval($atts['adaptive']),
        'kernel'=>sanitize_text_field($atts['kernel']),
    ]);

    if (is_wp_error($result)) {
        return '<pre>'.esc_html(wp_json_encode(['error'=>$result->get_error_message()], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)).'</pre>';
    }

    return '<pre class="arbe-json-only">'.esc_html(wp_json_encode($result['certificate'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)).'</pre>';
});


add_shortcode('arbe_fp_verify_certificate', function($atts) {
    $atts = shortcode_atts(['id'=>'', 'sha256'=>''], $atts);
    $q = trim($atts['id'] ?: $atts['sha256'] ?: ($_GET['certificate_id'] ?? '') ?: ($_GET['sha256'] ?? ''));
    if (!$q) return '<div class="arbe-error">Missing certificate ID or SHA-256.</div>';

    $row = arbe_fp_get_certificate_by_id_or_hash($q);
    if (!$row) return '<div class="arbe-error">Certificate not found in local registry.</div>';

    $v = arbe_fp_verify_certificate_payload($row['payload']);
    $payload = $row['payload'];
    $cert = $payload['certificate'] ?? [];
    $ref = $payload['reference'] ?? [];
    $formula = $payload['best_formula'] ?? [];
    $validation = $payload['validation'] ?? [];
    $confidence = $payload['confidence'] ?? [];

    ob_start();
    echo '<section class="arbe-solver">';
    echo '<div class="arbe-cert">';
    echo '<span class="arbe-kicker">Certificate Verification</span>';
    echo '<h3>'.esc_html($row['certificate_id']).'</h3>';
    echo '<p><span class="arbe-chip '.($v['valid'] ? 'arbe-chip-match' : 'arbe-chip-distinct').'">'.esc_html($v['valid'] ? 'VALID HASH' : 'INVALID HASH').'</span></p>';
    echo '<table class="arbe-table"><tbody>';
    echo '<tr><th>Registry Status</th><td>'.esc_html($row['registry_status']).'</td></tr>';
    echo '<tr><th>Created</th><td>'.esc_html($row['created_at']).'</td></tr>';
    echo '<tr><th>Reference</th><td><code>'.esc_html($ref['fp_color_id'] ?? '').'</code></td></tr>';
    echo '<tr><th>Batch-ID</th><td><code>'.esc_html($cert['batch_id'] ?? '').'</code></td></tr>';
    echo '<tr><th>Formula</th><td>'.esc_html($formula['label'] ?? '').'</td></tr>';
    echo '<tr><th>Similarity</th><td>'.esc_html(number_format(floatval($validation['similarity'] ?? 0), 2)).'%</td></tr>';
    echo '<tr><th>Confidence</th><td>'.esc_html(($confidence['confidence_grade'] ?? 'n/a') . ' / ' . number_format(floatval($confidence['confidence_score'] ?? 0), 1) . '%').'</td></tr>';
    echo '<tr><th>SHA-256</th><td><code>'.esc_html($row['sha256']).'</code></td></tr>';
    echo '</tbody></table>';
    echo '</div></section>';
    return ob_get_clean();
});


add_shortcode('arbe_fp_registry_lookup', function($atts) {
    $atts = shortcode_atts([
        'placeholder'=>'ARBE-FP-... or SHA-256',
        'title'=>'ARBE Certificate Registry Lookup'
    ], $atts);

    $q = trim($_GET['arbe_cert'] ?? $_GET['certificate_id'] ?? $_GET['sha256'] ?? '');

    ob_start();
    echo '<section class="arbe-solver arbe-registry">';
    echo '<span class="arbe-kicker">Public Registry</span>';
    echo '<h2>'.esc_html($atts['title']).'</h2>';
    echo '<form method="get" class="arbe-form">';
    echo '<label>Certificate-ID or SHA-256<input name="arbe_cert" value="'.esc_attr($q).'" placeholder="'.esc_attr($atts['placeholder']).'"></label>';
    echo '<button type="submit">Verify Certificate</button>';
    echo '</form>';

    if ($q) {
        $row = arbe_fp_get_certificate_by_id_or_hash($q);
        if (!$row) {
            echo '<div class="arbe-error">Certificate not found in local registry.</div>';
        } else {
            $v = arbe_fp_verify_certificate_payload($row['payload']);
            $payload = $row['payload'];
            $ref = $payload['reference'] ?? [];
            $formula = $payload['best_formula'] ?? [];
            $validation = $payload['validation'] ?? [];
            $confidence = $payload['confidence'] ?? [];
            $cert = $payload['certificate'] ?? [];

            echo '<div class="arbe-cert">';
            echo '<span class="arbe-kicker">Verification Result</span>';
            echo '<h3>'.esc_html($row['certificate_id']).'</h3>';
            echo '<p><span class="arbe-chip '.($v['valid'] ? 'arbe-chip-match' : 'arbe-chip-distinct').'">'.esc_html($v['valid'] ? 'VALID CERTIFICATE HASH' : 'INVALID CERTIFICATE HASH').'</span></p>';
            echo '<div class="arbe-cert-grid">';
            echo '<div><b>Reference</b><strong>'.esc_html($ref['fp_color_id'] ?? '').'</strong></div>';
            echo '<div><b>Formula</b><strong>'.esc_html($formula['label'] ?? '').'</strong></div>';
            echo '<div><b>Similarity</b><strong>'.esc_html(number_format(floatval($validation['similarity'] ?? 0), 2)).'%</strong></div>';
            echo '<div><b>Confidence</b><strong>'.esc_html(($confidence['confidence_grade'] ?? 'n/a') . ' / ' . number_format(floatval($confidence['confidence_score'] ?? 0), 1) . '%').'</strong></div>';
            echo '</div>';
            echo '<table class="arbe-table"><tbody>';
            echo '<tr><th>Batch-ID</th><td><code>'.esc_html($cert['batch_id'] ?? '').'</code></td></tr>';
            echo '<tr><th>Registry Status</th><td>'.esc_html($row['registry_status']).'</td></tr>';
            echo '<tr><th>Created</th><td>'.esc_html($row['created_at']).'</td></tr>';
            echo '<tr><th>SCISSOR</th><td>'.esc_html(number_format(floatval($validation['scissor'] ?? 0), 4)).'</td></tr>';
            echo '<tr><th>Kernel</th><td><code>'.esc_html(strtoupper($formula['kernel'] ?? '')).'</code></td></tr>';
            echo '<tr><th>Reference Mode</th><td><code>'.esc_html($ref['reference_mode'] ?? '').'</code></td></tr>';
            echo '<tr><th>SHA-256</th><td><code>'.esc_html($row['sha256']).'</code></td></tr>';
            echo '</tbody></table>';
            $json_url = rest_url('arbe/v1/certificate-json?id=' . rawurlencode($row['certificate_id']));
            $csv_url = rest_url('arbe/v1/certificate-csv?id=' . rawurlencode($row['certificate_id']));
            $print_url = rest_url('arbe/v1/certificate-print?id=' . rawurlencode($row['certificate_id']));
            echo '<p><a class="arbe-button" href="'.esc_url($json_url).'">Download JSON</a> <a class="arbe-button" href="'.esc_url($csv_url).'">Download CSV</a> <a class="arbe-button" href="'.esc_url($print_url).'" target="_blank" rel="noopener">Print / PDF</a></p>';
            echo '</div>';
        }
    } else {
        echo '<p class="arbe-note">Enter a Certificate-ID like <code>ARBE-FP-...</code> or a SHA-256 hash.</p>';
    }

    echo '</section>';
    return ob_get_clean();
});

?>