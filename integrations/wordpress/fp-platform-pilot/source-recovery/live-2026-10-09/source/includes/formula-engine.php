<?php
if (!defined('ABSPATH')) { exit; }

/**
 * Convert remission R to Kubelka-Munk K/S.
 * K/S = (1 - R)^2 / (2R)
 */
function arbe_fp_r_to_ks($r) {
    $r = max(0.0001, min(0.9999, floatval($r)));
    return (($r - 1.0) * ($r - 1.0)) / (2.0 * $r);
}

/**
 * Convert Kubelka-Munk K/S back to remission R.
 * Solves: x = (1-R)^2/(2R)
 * R = 1 + x - sqrt(x^2 + 2x)
 */
function arbe_fp_ks_to_r($ks) {
    $x = max(0.0, floatval($ks));
    $r = 1.0 + $x - sqrt(($x*$x) + (2.0*$x));
    return max(0.0, min(1.0, $r));
}

/**
 * Legacy linear remission mixing.
 */
function arbe_fp_mix_curves_linear($curves, $weights) {
    $wavelengths = array_keys($curves[0]);
    sort($wavelengths);
    $out = [];

    foreach ($wavelengths as $wl) {
        $r = 0.0;
        foreach ($curves as $i=>$curve) $r += $weights[$i] * ($curve[$wl] ?? 0.0);
        $out[$wl] = max(0.0, min(1.0, $r));
    }
    return $out;
}

/**
 * Kubelka-Munk K/S mixing.
 * Converts each remission curve to K/S, mixes K/S linearly, converts back to R.
 */
function arbe_fp_mix_curves_kubelka_munk($curves, $weights) {
    $wavelengths = array_keys($curves[0]);
    sort($wavelengths);
    $out = [];

    foreach ($wavelengths as $wl) {
        $ks_mix = 0.0;
        foreach ($curves as $i=>$curve) {
            $r = $curve[$wl] ?? 0.0;
            $ks_mix += $weights[$i] * arbe_fp_r_to_ks($r);
        }
        $out[$wl] = arbe_fp_ks_to_r($ks_mix);
    }
    return $out;
}

/**
 * Central mixing kernel selector.
 * kernel="km" is the v1.2 default.
 */
function arbe_fp_mix_curves($curves, $weights, $kernel='km') {
    $kernel = strtolower(trim(strval($kernel)));
    if ($kernel === 'linear' || $kernel === 'r') {
        return arbe_fp_mix_curves_linear($curves, $weights);
    }
    return arbe_fp_mix_curves_kubelka_munk($curves, $weights);
}

function arbe_fp_formula_label($formula) {
    $parts = [];
    foreach ($formula as $f) $parts[] = $f['code'] . ' ' . round($f['share']*100, 1) . '%';
    return implode(' + ', $parts);
}

function arbe_fp_formula_result($pigments, $weights, $curve, $cmp, $type, $kernel='km') {
    $formula = [];
    foreach ($pigments as $i=>$p) {
        $formula[] = [
            'code'=>$p->pigment_code,
            'name'=>$p->pigment_name,
            'family'=>$p->pigment_family,
            'share'=>$weights[$i],
        ];
    }

    return [
        'type'=>$type,
        'kernel'=>$kernel,
        'formula'=>$formula,
        'formula_label'=>arbe_fp_formula_label($formula),
        'curve'=>$curve,
        'scissor'=>$cmp['scissor_index'],
        'similarity'=>$cmp['similarity'],
        'rmse'=>$cmp['rmse'],
        'max_abs'=>$cmp['max_abs'],
        'edge_area'=>$cmp['edge_area'],
    ];
}
?>