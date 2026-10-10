<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_platform_smoke_test() {
    $steps = [];
    $ok = true;

    $diag = arbe_fp_platform_diagnostics();
    $steps[] = [
        'name' => 'Diagnostics',
        'status' => $diag['status'],
        'details' => $diag['recommendations'],
    ];
    if ($diag['status'] !== 'pass') $ok = false;

    $color = arbe_fp_get_color('H095_L090_C105');
    $steps[] = [
        'name' => 'Demo FP-Color exists',
        'status' => $color ? 'pass' : 'fail',
        'details' => $color ? ['H095_L090_C105 found'] : ['H095_L090_C105 missing'],
    ];
    if (!$color) $ok = false;

    $counts = arbe_fp_solver_counts();
    $has_pigments = intval($counts['pigments'] ?? 0) > 0 && intval($counts['curves'] ?? 0) > 0;
    $steps[] = [
        'name' => 'Pigment library available',
        'status' => $has_pigments ? 'pass' : 'warn',
        'details' => [$has_pigments ? 'Pigment curves available' : 'No pigment curves yet. Seed demo library or import curves.'],
    ];

    if ($color && $has_pigments) {
        $solve = arbe_fp_solve('H095_L090_C105', [
            'top'=>3,
            'max_candidates'=>5,
            'max_components'=>3,
            'step'=>10,
            'adaptive'=>1,
            'kernel'=>'km',
        ]);

        $has_solution = !is_wp_error($solve) && !empty($solve['solutions']);
        $steps[] = [
            'name' => 'Solver produces solution',
            'status' => $has_solution ? 'pass' : 'fail',
            'details' => [$has_solution ? 'Solution generated' : 'No solution generated'],
        ];
        if (!$has_solution) $ok = false;

        if ($has_solution) {
            $cert = $solve['certificate'] ?? null;
            $cert_ok = !empty($cert['certificate']['id']) && !empty($cert['certificate']['sha256']);
            $steps[] = [
                'name' => 'Certificate generated',
                'status' => $cert_ok ? 'pass' : 'fail',
                'details' => [$cert_ok ? $cert['certificate']['id'] : 'Certificate missing'],
            ];
            if (!$cert_ok) $ok = false;

            if ($cert_ok) {
                arbe_fp_register_certificate($cert);
                $row = arbe_fp_get_certificate_by_id_or_hash($cert['certificate']['id']);
                $verify = $row ? arbe_fp_verify_certificate_payload($row['payload']) : ['valid'=>false];
                $steps[] = [
                    'name' => 'Registry verification',
                    'status' => !empty($verify['valid']) ? 'pass' : 'fail',
                    'details' => [!empty($verify['valid']) ? 'Hash valid' : 'Hash invalid or registry missing'],
                ];
                if (empty($verify['valid'])) $ok = false;
            }
        }
    }

    return [
        'engine' => 'ARBE FP Platform',
        'version' => ARBE_FP_SOLVER_VERSION,
        'status' => $ok ? 'pass' : 'fail',
        'steps' => $steps,
        'timestamp_utc' => gmdate('c'),
    ];
}
?>