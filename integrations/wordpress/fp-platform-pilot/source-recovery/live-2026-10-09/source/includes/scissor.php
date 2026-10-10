<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_scissor_compare_curves($a, $b) {
    $common = array_values(array_intersect(array_keys($a), array_keys($b)));
    sort($common);

    $area_abs=0.0; $area_signed=0.0; $sum_sq=0.0; $max_abs=0.0; $max_abs_nm=$common[0] ?? 0; $edge_area=0.0;

    for ($i=0; $i<count($common); $i++) {
        $wl=$common[$i];
        $d=$a[$wl]-$b[$wl];
        $sum_sq += $d*$d;

        if (abs($d)>$max_abs) {
            $max_abs=abs($d);
            $max_abs_nm=$wl;
        }

        if ($i>0) {
            $wl0=$common[$i-1]; $wl1=$common[$i]; $step=max(1,$wl1-$wl0);
            $d0=$a[$wl0]-$b[$wl0]; $d1=$a[$wl1]-$b[$wl1];
            $area_abs += $step*(abs($d0)+abs($d1))/2.0;
            $area_signed += $step*($d0+$d1)/2.0;

            $ga=($a[$wl1]-$a[$wl0])/$step;
            $gb=($b[$wl1]-$b[$wl0])/$step;
            $edge_area += abs($ga-$gb)*$step;
        }
    }

    $rmse = count($common) ? sqrt($sum_sq/count($common)) : 0.0;
    $scissor_index = $area_abs + 250.0*$edge_area;
    $similarity = max(0.0, min(100.0, 100.0 * exp(-0.018 * $scissor_index)));

    return [
        'area_abs'=>$area_abs,
        'area_signed'=>$area_signed,
        'rmse'=>$rmse,
        'max_abs'=>$max_abs,
        'max_abs_nm'=>$max_abs_nm,
        'edge_area'=>$edge_area,
        'scissor_index'=>$scissor_index,
        'similarity'=>$similarity,
    ];
}

function arbe_fp_reference_curve_from_color($color, $wavelengths) {
    $points = [
        intval($color->psf_p1_nm)=>floatval($color->psf_p1_r),
        intval($color->psf_p2_nm)=>floatval($color->psf_p2_r),
        intval($color->psf_p3_nm)=>floatval($color->psf_p3_r),
        intval($color->psf_p4_nm)=>floatval($color->psf_p4_r),
    ];
    ksort($points);
    $pwl = array_keys($points);
    $pr = array_values($points);
    $out = [];

    foreach ($wavelengths as $wl) {
        if ($wl <= $pwl[0]) {
            $out[$wl] = $pr[0];
        } elseif ($wl >= $pwl[count($pwl)-1]) {
            $out[$wl] = $pr[count($pr)-1];
        } else {
            for ($i=1; $i<count($pwl); $i++) {
                if ($wl <= $pwl[$i]) {
                    $x0=$pwl[$i-1]; $x1=$pwl[$i]; $y0=$pr[$i-1]; $y1=$pr[$i];
                    $t=($wl-$x0)/max(1,($x1-$x0));
                    $out[$wl] = $y0 + $t*($y1-$y0);
                    break;
                }
            }
        }
    }
    return $out;
}

function arbe_fp_match_label($similarity) {
    if ($similarity >= 98) return ['Structural Match', 'match'];
    if ($similarity >= 94) return ['High Similarity', 'similar'];
    if ($similarity >= 85) return ['Usable Candidate', 'different'];
    return ['Different Structure', 'distinct'];
}
?>