<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_preselect_candidates($color, $limit=8) {
    $points = [
        ['nm'=>intval($color->psf_p1_nm),'r'=>floatval($color->psf_p1_r)],
        ['nm'=>intval($color->psf_p2_nm),'r'=>floatval($color->psf_p2_r)],
        ['nm'=>intval($color->psf_p3_nm),'r'=>floatval($color->psf_p3_r)],
        ['nm'=>intval($color->psf_p4_nm),'r'=>floatval($color->psf_p4_r)],
    ];

    $items = arbe_fp_get_pigments(1000);
    $weights = [0.8, 1.8, 1.1, 0.7];
    $tol_nm = [30, 16, 30, 45];
    $tol_r = [0.100, 0.070, 0.120, 0.170];

    foreach ($items as $p) {
        $db = [
            ['nm'=>intval($p->psf_p1_nm),'r'=>floatval($p->psf_p1_r)],
            ['nm'=>intval($p->psf_p2_nm),'r'=>floatval($p->psf_p2_r)],
            ['nm'=>intval($p->psf_p3_nm),'r'=>floatval($p->psf_p3_r)],
            ['nm'=>intval($p->psf_p4_nm),'r'=>floatval($p->psf_p4_r)],
        ];

        $err=0.0;
        for ($i=0; $i<4; $i++) {
            $dnm = abs($db[$i]['nm']-$points[$i]['nm'])/max(1,$tol_nm[$i]);
            $dr = abs($db[$i]['r']-$points[$i]['r'])/max(0.0001,$tol_r[$i]);
            $err += $weights[$i]*(($dnm*$dnm)+($dr*$dr));
        }
        $p->preselect_error = sqrt($err/array_sum($weights));
        $p->preselect_score = max(0.0, min(100.0, 100.0*exp(-0.42*$p->preselect_error)));
    }

    usort($items, fn($a,$b) => $b->preselect_score <=> $a->preselect_score);
    return array_slice($items, 0, max(1,$limit));
}

function arbe_fp_optimize_formula($color, $args=[]) {
    $args = wp_parse_args($args, [
        'top'=>10,
        'max_candidates'=>7,
        'max_components'=>3,
        'step'=>10,
        'adaptive'=>1,
        'kernel'=>'km',
        'candidate_codes'=>[],
    ]);

    $step = max(5, min(25, intval($args['step'])));
    $kernel = strtolower(trim(strval($args['kernel'] ?? 'km')));
    $max_components = max(1, min(4, intval($args['max_components'])));
    $candidates = arbe_fp_preselect_candidates($color, intval($args['max_candidates']));
    if (!$candidates) return [];

    $first_curve = arbe_fp_get_curve($candidates[0]->id);
    if (!$first_curve) return [];

    $ref_curve = arbe_fp_get_reference_curve_for_color($color, array_keys($first_curve));
    $results = [];
    $n = count($candidates);

    // Singles
    for ($i=0; $i<$n; $i++) {
        $p = $candidates[$i];
        $curve = arbe_fp_get_curve($p->id);
        if (!$curve) continue;
        $cmp = arbe_fp_scissor_compare_curves($ref_curve, $curve);
        $results[] = arbe_fp_formula_result([$p], [1.0], $curve, $cmp, '1-component', $kernel);
    }

    // Pairs
    if ($max_components >= 2) {
        for ($i=0; $i<$n; $i++) {
            for ($j=$i+1; $j<$n; $j++) {
                $p1=$candidates[$i]; $p2=$candidates[$j];
                $c1=arbe_fp_get_curve($p1->id); $c2=arbe_fp_get_curve($p2->id);
                if (!$c1 || !$c2) continue;
                for ($a=$step; $a<=100-$step; $a += $step) {
                    $w=[$a/100.0, (100-$a)/100.0];
                    $mix=arbe_fp_mix_curves([$c1,$c2], $w, $kernel);
                    $cmp=arbe_fp_scissor_compare_curves($ref_curve, $mix);
                    $results[] = arbe_fp_formula_result([$p1,$p2], $w, $mix, $cmp, '2-component', $kernel);
                }
            }
        }
    }

    // Triples
    if ($max_components >= 3) {
        $n3 = min($n, 6);
        for ($i=0; $i<$n3; $i++) {
            for ($j=$i+1; $j<$n3; $j++) {
                for ($k=$j+1; $k<$n3; $k++) {
                    $p1=$candidates[$i]; $p2=$candidates[$j]; $p3=$candidates[$k];
                    $c1=arbe_fp_get_curve($p1->id); $c2=arbe_fp_get_curve($p2->id); $c3=arbe_fp_get_curve($p3->id);
                    if (!$c1 || !$c2 || !$c3) continue;
                    for ($a=$step; $a<=100-2*$step; $a += $step) {
                        for ($b=$step; $b<=100-$a-$step; $b += $step) {
                            $c=100-$a-$b;
                            if ($c < $step) continue;
                            $w=[$a/100.0, $b/100.0, $c/100.0];
                            $mix=arbe_fp_mix_curves([$c1,$c2,$c3], $w, $kernel);
                            $cmp=arbe_fp_scissor_compare_curves($ref_curve, $mix);
                            $results[] = arbe_fp_formula_result([$p1,$p2,$p3], $w, $mix, $cmp, '3-component', $kernel);
                        }
                    }
                }
            }
        }
    }

    usort($results, fn($a,$b) => $a['scissor'] <=> $b['scissor']);

    if (intval($args['adaptive']) === 1) {
        $results = arbe_fp_adaptive_refine_results($results, $ref_curve, 24, $kernel);
        usort($results, fn($a,$b) => $a['scissor'] <=> $b['scissor']);
    }

    $unique=[]; $seen=[];
    foreach ($results as $r) {
        $key_parts=[];
        foreach ($r['formula'] as $f) $key_parts[] = $f['code'].':'.round($f['share']*100, 1);
        $key=implode('|',$key_parts);
        if (isset($seen[$key])) continue;
        $seen[$key]=true;
        $r['confidence'] = arbe_fp_confidence_grade($r, 'demo');
        $unique[]=$r;
        if (count($unique) >= intval($args['top'])) break;
    }

    return [
        'reference_curve'=>$ref_curve,
        'candidates'=>$candidates,
        'solutions'=>$unique,
        'settings'=>$args,
    ];
}

/**
 * Adaptive local refinement.
 * Starts from the best grid solutions and perturbs component shares in smaller steps.
 * This is still remission-linear v1.1 logic, but removes the coarse 10% raster effect.
 */
function arbe_fp_adaptive_refine_results($results, $ref_curve, $seed_limit=24, $kernel='km') {
    if (!$results) return [];
    $out = $results;
    $seeds = array_slice($results, 0, max(1, intval($seed_limit)));

    foreach ($seeds as $seed) {
        if (count($seed['formula']) < 2) continue;

        $pigments = [];
        $curves = [];
        foreach ($seed['formula'] as $f) {
            $p = arbe_fp_get_pigment($f['code']);
            if (!$p) { $pigments = []; break; }
            $curve = arbe_fp_get_curve($p->id);
            if (!$curve) { $pigments = []; break; }
            $pigments[] = $p;
            $curves[] = $curve;
        }
        if (!$pigments) continue;

        $weights = array_map(fn($f) => floatval($f['share']), $seed['formula']);
        $best = $seed;
        $steps = [0.05, 0.02, 0.01];

        foreach ($steps as $delta) {
            $improved = true;
            $guard = 0;

            while ($improved && $guard < 80) {
                $guard++;
                $improved = false;
                $n = count($weights);

                for ($i=0; $i<$n; $i++) {
                    for ($j=0; $j<$n; $j++) {
                        if ($i === $j) continue;
                        if ($weights[$j] - $delta < 0.01) continue;

                        $trial = $weights;
                        $trial[$i] += $delta;
                        $trial[$j] -= $delta;
                        $trial = arbe_fp_normalize_weights($trial);

                        $mix = arbe_fp_mix_curves($curves, $trial, $kernel);
                        $cmp = arbe_fp_scissor_compare_curves($ref_curve, $mix);

                        if ($cmp['scissor_index'] < $best['scissor']) {
                            $best = arbe_fp_formula_result($pigments, $trial, $mix, $cmp, count($trial) . '-component adaptive', $kernel);
                            $weights = $trial;
                            $improved = true;
                        }
                    }
                }
            }
        }

        $out[] = $best;
    }

    return $out;
}

function arbe_fp_normalize_weights($weights) {
    $sum = array_sum($weights);
    if ($sum <= 0) return $weights;
    return array_map(fn($w) => max(0.0, min(1.0, $w / $sum)), $weights);
}
?>