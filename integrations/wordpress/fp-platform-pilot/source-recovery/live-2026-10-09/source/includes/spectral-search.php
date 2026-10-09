<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_parse_color_query($q) {
    $q = strtoupper(trim(strval($q)));
    if (preg_match('/^FP::(H[0-9]{3}_L[0-9]{3}_C[0-9]{3})(?:::|$)/', $q, $m)) { return $m[1]; }
    $q = str_replace('FP:', '', $q);
    return trim($q);
}

function arbe_fp_spectral_search($fp_color_id, $args=[]) {
    $args = wp_parse_args($args, [
        'limit'=>20,
        'kernel'=>'km',
    ]);

    $fp_color_id = arbe_fp_parse_color_query($fp_color_id);
    $color = arbe_fp_get_color($fp_color_id);
    if (!$color) {
        return new WP_Error('arbe_color_not_found', 'FP-Color not found in master.', ['status'=>404]);
    }

    $pigments = arbe_fp_get_pigments(2000);
    if (!$pigments) {
        return new WP_Error('arbe_no_pigments', 'No pigment curves found. Import pigment curves first.', ['status'=>404]);
    }

    $first_curve = null;
    foreach ($pigments as $p) {
        $c = arbe_fp_get_curve($p->id);
        if ($c) { $first_curve = $c; break; }
    }
    if (!$first_curve) return new WP_Error('arbe_no_curves', 'Pigments exist, but no curve points were found.', ['status'=>404]);

    $reference_curve = arbe_fp_get_reference_curve_for_color($color, array_keys($first_curve));

    $results = [];
    foreach ($pigments as $p) {
        $curve = arbe_fp_get_curve($p->id);
        if (!$curve) continue;
        $ref = arbe_fp_get_reference_curve_for_color($color, array_keys($curve));
        $cmp = arbe_fp_scissor_compare_curves($ref, $curve);
        [$label, $class] = arbe_fp_match_label($cmp['similarity']);

        $results[] = [
            'pigment_id'=>intval($p->id),
            'pigment_code'=>$p->pigment_code,
            'pigment_name'=>$p->pigment_name,
            'pigment_family'=>$p->pigment_family,
            'source_id'=>$p->source_id,
            'curve_status'=>$p->curve_status,
            'similarity'=>$cmp['similarity'],
            'scissor'=>$cmp['scissor_index'],
            'rmse'=>$cmp['rmse'],
            'max_abs'=>$cmp['max_abs'],
            'edge_area'=>$cmp['edge_area'],
            'match_label'=>$label,
            'match_class'=>$class,
            'curve'=>$curve,
        ];
    }

    usort($results, fn($a,$b) => $b['similarity'] <=> $a['similarity']);
    $results = array_slice($results, 0, intval($args['limit']));

    arbe_fp_audit_log('spectral_search', [
        'object_type'=>'fp_color',
        'object_id'=>$fp_color_id,
        'fp_color_id'=>$fp_color_id,
        'payload'=>[
            'result_count'=>count($results),
            'pigments_scanned'=>count($pigments),
        ],
    ]);

    return [
        'fp_color'=>[
            'id'=>$color->fp_color_id,
            'name'=>$color->color_name,
            'hex'=>$color->hex_value,
            'reference_mode'=>arbe_fp_get_color_curve($color->id) ? 'measured_full_curve' : '4psf_reconstructed',
        ],
        'reference_curve'=>$reference_curve,
        'results'=>$results,
    ];
}

function arbe_fp_render_spectral_search($fp_color_id='', $atts=[]) {
    $atts = shortcode_atts([
        'color'=>$fp_color_id,
        'limit'=>'20',
        'show_solver'=>'1',
    ], $atts);

    $requested = arbe_fp_parse_color_query($_GET['fp_color'] ?? $atts['color']);
    $compare = strtoupper(trim($_GET['compare_pigment'] ?? ''));

    ob_start();
    echo '<section class="arbe-solver arbe-search-engine">';
    echo '<span class="arbe-kicker">ARBE Spectral Search Engine v1.0</span>';
    echo '<h2>FP-Code → Pigment Ranking → SCISSOR</h2>';
    echo '<form method="get" class="arbe-form">';
    echo '<label>FP-Code / FP-Color ID<input name="fp_color" value="'.esc_attr($requested).'" placeholder="FP::H095_L090_C105"></label>';
    echo '<button type="submit">Search Pigments</button>';
    echo '</form>';

    if (!$requested) {
        echo '<p class="arbe-note">Gib einen FP-Code ein, z. B. <code>FP::H095_L090_C105</code>.</p>';
        echo '</section>';
        return ob_get_clean();
    }

    $search = arbe_fp_spectral_search($requested, ['limit'=>intval($atts['limit'])]);
    if (is_wp_error($search)) {
        echo '<div class="arbe-error">'.esc_html($search->get_error_message()).'</div>';
        echo '</section>';
        return ob_get_clean();
    }

    $color = $search['fp_color'];
    $results = $search['results'];
    $ref_curve = $search['reference_curve'];

    echo '<div class="arbe-card">';
    echo '<span class="arbe-kicker">Reference</span><h3>'.esc_html($color['id']).'</h3>';
    if (!empty($color['hex'])) echo '<div class="arbe-swatch" style="background:'.esc_attr($color['hex']).'"></div>';
    echo '<p><strong>Reference mode:</strong> <code>'.esc_html($color['reference_mode']).'</code></p>';
    echo '<p><strong>Pigments ranked:</strong> '.intval(count($results)).'</p>';
    echo '</div>';

    echo arbe_fp_render_hlc_candidates_public($color['id']);

    if (!$results) {
        echo '<div class="arbe-error">No matching pigment curves found.</div></section>';
        return ob_get_clean();
    }

    $best = $results[0];
    echo '<div class="arbe-best">';
    echo '<span class="arbe-kicker">Best Pigment Match</span>';
    echo '<h3><code>'.esc_html($best['pigment_code']).'</code> '.esc_html($best['pigment_name']).'</h3>';
    echo '<div class="arbe-metric-row">';
    echo '<div><b>Similarity</b><strong>'.esc_html(number_format($best['similarity'],2)).'%</strong></div>';
    echo '<div><b>SCISSOR</b><strong>'.esc_html(number_format($best['scissor'],4)).'</strong></div>';
    echo '<div><b>RMSE</b><strong>'.esc_html(number_format($best['rmse'],4)).'</strong></div>';
    echo '</div>';
    echo '<p><span class="arbe-chip arbe-chip-'.esc_attr($best['match_class']).'">'.esc_html($best['match_label']).'</span></p>';
    echo '</div>';

    echo '<h3>Pigment Ranking</h3>';
    echo '<table class="arbe-table"><thead><tr><th>Rank</th><th>Pigment</th><th>Similarity</th><th>SCISSOR</th><th>RMSE</th><th>Action</th></tr></thead><tbody>';
    $rank=1;
    foreach ($results as $r) {
        $url = add_query_arg(['fp_color'=>$color['id'], 'compare_pigment'=>$r['pigment_code']]);
        echo '<tr>';
        echo '<td>'.intval($rank++).'</td>';
        echo '<td><code>'.esc_html($r['pigment_code']).'</code><br>'.esc_html($r['pigment_name']).'<br><small>'.esc_html($r['pigment_family']).' · '.esc_html($r['curve_status']).'</small></td>';
        echo '<td><strong>'.esc_html(number_format($r['similarity'],2)).'%</strong></td>';
        echo '<td>'.esc_html(number_format($r['scissor'],4)).'</td>';
        echo '<td>'.esc_html(number_format($r['rmse'],4)).'</td>';
        echo '<td><a class="arbe-button" href="'.esc_url($url).'#arbe-scissor-overlay">Show SCISSOR</a></td>';
        echo '</tr>';
    }
    echo '</tbody></table>';

    $selected = $compare ? null : $best;
    if ($compare) {
        foreach ($results as $r) if ($r['pigment_code'] === $compare) { $selected = $r; break; }
        if (!$selected) {
            $p = arbe_fp_get_pigment($compare);
            if ($p) {
                $curve = arbe_fp_get_curve($p->id);
                $ref = arbe_fp_get_reference_curve_for_color(arbe_fp_get_color($color['id']), array_keys($curve));
                $cmp = arbe_fp_scissor_compare_curves($ref, $curve);
                [$label,$class] = arbe_fp_match_label($cmp['similarity']);
                $selected = [
                    'pigment_code'=>$p->pigment_code,
                    'pigment_name'=>$p->pigment_name,
                    'curve'=>$curve,
                    'similarity'=>$cmp['similarity'],
                    'scissor'=>$cmp['scissor_index'],
                    'rmse'=>$cmp['rmse'],
                    'match_label'=>$label,
                    'match_class'=>$class,
                ];
            }
        }
    }

    if ($selected) {
        echo '<div id="arbe-scissor-overlay">';
        echo '<h3>SCISSOR Overlay: '.esc_html($color['id']).' vs '.esc_html($selected['pigment_code']).'</h3>';
        $chart_id = 'arbe_search_chart_' . wp_rand(1000,999999);
        $ref_for_selected = arbe_fp_get_reference_curve_for_color(arbe_fp_get_color($color['id']), array_keys($selected['curve']));
        echo '<div class="arbe-chart"><canvas id="'.esc_attr($chart_id).'" height="130"></canvas></div>';
        echo '<script type="application/json" class="arbe-chart-data" data-chart-id="'.esc_attr($chart_id).'">'.wp_json_encode([
            'labels'=>array_values(array_keys($selected['curve'])),
            'a_label'=>'FP Reference',
            'b_label'=>$selected['pigment_code'],
            'a'=>array_values($ref_for_selected),
            'b'=>array_values($selected['curve']),
        ]).'</script>';
        echo '</div>';
    }

    if (intval($atts['show_solver']) === 1) {
        echo '<h3>Formula Solver</h3>';
        echo '<p class="arbe-note">Der Solver nutzt die importierten Pigmente und sucht die beste Mischung. Jede Mischung kann jetzt als Kurve gegen die FP-Referenz angezeigt werden.</p>';

        $selected_formula_index = isset($_GET['formula_index']) ? intval($_GET['formula_index']) : 0;
        $hlc_candidate_codes = function_exists('arbe_hlc_acq_pigment_codes_for_hlc') ? arbe_hlc_acq_pigment_codes_for_hlc($color['id']) : [];
        $hlc_available_pigments = function_exists('arbe_hlc_acq_available_pigments_for_hlc') ? arbe_hlc_acq_available_pigments_for_hlc($color['id']) : [];
        if (!empty($hlc_candidate_codes)) {
            echo '<p class="arbe-note"><strong>HLC-guided mode:</strong> '.intval(count($hlc_candidate_codes)).' Pigmentkandidaten aus dem HLC-Acquisition-Layer gefunden. Davon haben '.intval(count($hlc_available_pigments)).' importierte Remissionskurven.</p>';
        }
        $solve_args = ['top'=>10,'max_candidates'=>7,'max_components'=>3,'step'=>10,'adaptive'=>1,'kernel'=>'km'];
        if (!empty($hlc_available_pigments)) {
            $solve_args['candidate_codes'] = $hlc_candidate_codes;
            $solve_args['max_candidates'] = max(3, count($hlc_candidate_codes));
        }
        $solve = arbe_fp_solve($color['id'], $solve_args);

        if (!is_wp_error($solve) && !empty($solve['solutions'])) {
            $solutions = $solve['solutions'];
            if ($selected_formula_index < 0 || $selected_formula_index >= count($solutions)) $selected_formula_index = 0;
            $selected_formula = $solutions[$selected_formula_index];

            echo '<div class="arbe-best">';
            echo '<span class="arbe-kicker">Selected Formula</span>';
            echo '<h3>'.esc_html(arbe_fp_formula_label($selected_formula['formula'])).'</h3>';
            echo '<div class="arbe-metric-row">';
            echo '<div><b>Similarity</b><strong>'.esc_html(number_format($selected_formula['similarity'],2)).'%</strong></div>';
            echo '<div><b>SCISSOR</b><strong>'.esc_html(number_format($selected_formula['scissor'],4)).'</strong></div>';
            echo '<div><b>Confidence</b><strong>'.esc_html(($selected_formula['confidence']['confidence_grade'] ?? 'n/a')).'</strong></div>';
            echo '</div>';
            echo '</div>';

            echo '<h4>Formula Candidates</h4>';
            echo '<table class="arbe-table"><thead><tr><th>Rank</th><th>Formula</th><th>Similarity</th><th>SCISSOR</th><th>Confidence</th><th>Action</th></tr></thead><tbody>';
            foreach ($solutions as $idx=>$formula) {
                $url = add_query_arg(['fp_color'=>$color['id'], 'formula_index'=>$idx]);
                $active = ($idx === $selected_formula_index) ? ' <strong>selected</strong>' : '';
                echo '<tr>';
                echo '<td>'.intval($idx+1).'</td>';
                echo '<td><code>'.esc_html(arbe_fp_formula_label($formula['formula'])).'</code>'.$active.'</td>';
                echo '<td><strong>'.esc_html(number_format($formula['similarity'],2)).'%</strong></td>';
                echo '<td>'.esc_html(number_format($formula['scissor'],4)).'</td>';
                echo '<td>'.esc_html(($formula['confidence']['confidence_grade'] ?? 'n/a')).'</td>';
                echo '<td><a class="arbe-button" href="'.esc_url($url).'#arbe-formula-scissor">Show Formula Curve</a></td>';
                echo '</tr>';
            }
            echo '</tbody></table>';

            echo '<div id="arbe-formula-scissor">';
            echo '<h3>Formula SCISSOR Overlay</h3>';
            $chart_id = 'arbe_formula_chart_' . wp_rand(1000,999999);
            $ref_for_formula = arbe_fp_get_reference_curve_for_color(arbe_fp_get_color($color['id']), array_keys($selected_formula['curve']));
            $diff = [];
            foreach ($selected_formula['curve'] as $wl=>$r) {
                $diff[] = ($ref_for_formula[$wl] ?? 0) - $r;
            }
            echo '<div class="arbe-chart"><canvas id="'.esc_attr($chart_id).'" height="130"></canvas></div>';
            echo '<script type="application/json" class="arbe-chart-data" data-chart-id="'.esc_attr($chart_id).'">'.wp_json_encode([
                'labels'=>array_values(array_keys($selected_formula['curve'])),
                'a_label'=>'FP Reference',
                'b_label'=>'Formula: '.arbe_fp_formula_label($selected_formula['formula']),
                'a'=>array_values($ref_for_formula),
                'b'=>array_values($selected_formula['curve']),
                'difference'=>$diff,
            ]).'</script>';
            echo '</div>';

            echo arbe_fp_render_formula_component_table($selected_formula);
            echo arbe_fp_render_certificate($solve);
        } else {
            echo '<div class="arbe-error">Solver result unavailable.</div>';
        }
    }

    echo '</section>';
    return ob_get_clean();
}

function arbe_fp_render_formula_component_table($formula) {
    if (empty($formula['formula'])) return '';
    ob_start();
    echo '<h4>Formula Components</h4>';
    echo '<table class="arbe-table"><thead><tr><th>Pigment</th><th>Name</th><th>Share</th></tr></thead><tbody>';
    foreach ($formula['formula'] as $f) {
        echo '<tr>';
        echo '<td><code>'.esc_html($f['code']).'</code></td>';
        echo '<td>'.esc_html($f['name'] ?? '').'</td>';
        echo '<td><strong>'.esc_html(number_format(floatval($f['share'])*100, 1)).'%</strong></td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
    return ob_get_clean();
}


function arbe_fp_render_hlc_candidates_public($hlc_id) {
    if (!function_exists('arbe_hlc_acq_recent_candidates')) return '';
    $hlc_id = arbe_hlc_acq_normalize_hlc($hlc_id);
    $candidates = arbe_hlc_acq_recent_candidates($hlc_id, 50);
    $materials = $candidates['materials'] ?? [];
    $pigments = $candidates['pigments'] ?? [];

    if (empty($materials) && empty($pigments)) {
        return '<div class="arbe-card"><span class="arbe-kicker">HLC Acquisition</span><h3>No HLC candidates imported yet</h3><p class="arbe-note">Import Material/Pigment Candidates via <code>ARBE FP Platform → HLC Acquisition</code>.</p><p><a class="arbe-button" href="https://artistpigments.org/hlc_atlas/'.esc_attr($hlc_id).'" target="_blank" rel="noopener">Open ArtistPigments HLC Atlas</a></p></div>';
    }

    ob_start();
    echo '<div class="arbe-card arbe-hlc-public">';
    echo '<span class="arbe-kicker">HLC Acquisition Candidates</span>';
    echo '<h3>'.esc_html($hlc_id).'</h3>';
    echo '<p><a class="arbe-button" href="https://artistpigments.org/hlc_atlas/'.esc_attr($hlc_id).'" target="_blank" rel="noopener">Open HLC Atlas Source</a></p>';

    if (!empty($materials)) {
        echo '<h4>Material Candidates</h4>';
        echo '<table class="arbe-table"><thead><tr><th>Material</th><th>Series</th><th>Quality</th><th>Source</th></tr></thead><tbody>';
        foreach ($materials as $m) {
            echo '<tr>';
            echo '<td><a href="'.esc_url($m->material_url).'" target="_blank" rel="noopener">'.esc_html($m->material_link_text ?: $m->product_slug).'</a></td>';
            echo '<td>'.esc_html($m->brand_series_slug).'</td>';
            echo '<td><code>'.esc_html($m->data_quality).'</code></td>';
            echo '<td>'.esc_html($m->source_id).'</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
    }

    if (!empty($pigments)) {
        echo '<h4>Pigment Candidates</h4>';
        echo '<div class="arbe-pigment-chips">';
        foreach ($pigments as $p) {
            echo '<a class="arbe-pigment-chip" href="'.esc_url($p->pigment_url).'" target="_blank" rel="noopener"><code>'.esc_html($p->pigment_code).'</code></a>';
        }
        echo '</div>';
        echo '<p class="arbe-note">Diese Pigmente sind Kandidaten aus dem HLC-Acquisition-Layer. Für SCISSOR/Solver werden zusätzlich importierte Remissionskurven benötigt.</p>';

        echo '<h4>Curve Availability</h4>';
        echo '<table class="arbe-table"><thead><tr><th>Pigment</th><th>Curve imported?</th><th>Solver status</th></tr></thead><tbody>';
        foreach ($pigments as $p) {
            $pigment_obj = function_exists('arbe_fp_get_pigment') ? arbe_fp_get_pigment($p->pigment_code) : null;
            $has_curve = false;
            if ($pigment_obj) {
                $curve = arbe_fp_get_curve($pigment_obj->id);
                $has_curve = !empty($curve);
            }
            echo '<tr>';
            echo '<td><code>'.esc_html($p->pigment_code).'</code></td>';
            echo '<td>'.($has_curve ? 'yes' : 'no').'</td>';
            echo '<td>'.($has_curve ? 'usable in HLC-guided solver' : 'metadata only — import remission curve first').'</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
    }

    echo '</div>';
    return ob_get_clean();
}

?>