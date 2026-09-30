<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_solve($fp_color_id, $args=[]) {
    $color = arbe_fp_get_color($fp_color_id);
    if (!$color) {
        return new WP_Error('arbe_color_not_found', 'FP-Color not found in master.', ['status'=>404]);
    }

    $result = arbe_fp_optimize_formula($color, $args);
    $reference_mode = arbe_fp_get_color_curve($color->id) ? 'measured_full_curve' : '4psf_reconstructed';

    $solve = [
        'engine'=>'ARBE FP Structural Solver',
        'version'=>ARBE_FP_SOLVER_VERSION,
        'fp_color'=>[
            'id'=>$color->fp_color_id,
            'name'=>$color->color_name,
            'hex'=>$color->hex_value,
            'status'=>$color->source_status,
            'psf'=>[
                ['nm'=>intval($color->psf_p1_nm), 'r'=>floatval($color->psf_p1_r)],
                ['nm'=>intval($color->psf_p2_nm), 'r'=>floatval($color->psf_p2_r)],
                ['nm'=>intval($color->psf_p3_nm), 'r'=>floatval($color->psf_p3_r)],
                ['nm'=>intval($color->psf_p4_nm), 'r'=>floatval($color->psf_p4_r)],
            ],
        ],
        'settings'=>$result['settings'] ?? $args,
        'solutions'=>$result['solutions'] ?? [],
        'reference_curve'=>$result['reference_curve'] ?? [],
        'reference_mode'=>$reference_mode,
    ];

    $solve['certificate'] = arbe_fp_certificate_payload($solve);
    return $solve;
}
?>