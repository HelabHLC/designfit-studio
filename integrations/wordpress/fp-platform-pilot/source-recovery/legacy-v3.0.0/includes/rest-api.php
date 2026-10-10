<?php
if (!defined('ABSPATH')) { exit; }

add_action('rest_api_init', function() {
    register_rest_route('arbe/v1', '/solve', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_solve',
        'permission_callback'=>'__return_true',
        'args'=>[
            'color'=>['required'=>true],
            'top'=>['required'=>false],
            'max_candidates'=>['required'=>false],
            'max_components'=>['required'=>false],
            'step'=>['required'=>false],
            'adaptive'=>['required'=>false],
            'kernel'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/certificate', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_certificate',
        'permission_callback'=>'__return_true',
        'args'=>[
            'color'=>['required'=>true],
            'top'=>['required'=>false],
            'max_candidates'=>['required'=>false],
            'max_components'=>['required'=>false],
            'step'=>['required'=>false],
            'adaptive'=>['required'=>false],
            'kernel'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/verify', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_verify',
        'permission_callback'=>'__return_true',
        'args'=>[
            'id'=>['required'=>false],
            'sha256'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/certificate-json', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_certificate_json_export',
        'permission_callback'=>'__return_true',
        'args'=>[
            'id'=>['required'=>false],
            'sha256'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/certificate-csv', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_certificate_csv_export',
        'permission_callback'=>'__return_true',
        'args'=>[
            'id'=>['required'=>false],
            'sha256'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/certificate-print', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_certificate_print_export',
        'permission_callback'=>'__return_true',
        'args'=>[
            'id'=>['required'=>false],
            'sha256'=>['required'=>false],
        ],
    ]);

    register_rest_route('arbe/v1', '/health', [
        'methods'=>'GET',
        'callback'=>'arbe_fp_rest_health',
        'permission_callback'=>'__return_true',
    ]);
});

function arbe_fp_rest_solve(WP_REST_Request $request) {
    $args = [
        'top'=>intval($request->get_param('top') ?: 10),
        'max_candidates'=>intval($request->get_param('max_candidates') ?: 7),
        'max_components'=>intval($request->get_param('max_components') ?: 3),
        'step'=>intval($request->get_param('step') ?: 10),
        'adaptive'=>intval($request->get_param('adaptive') === null ? 1 : $request->get_param('adaptive')),
        'kernel'=>sanitize_text_field($request->get_param('kernel') ?: 'km'),
    ];
    return arbe_fp_solve($request->get_param('color'), $args);
}
function arbe_fp_rest_certificate(WP_REST_Request $request) {
    $result = arbe_fp_rest_solve($request);
    if (is_wp_error($result)) return $result;
    return $result['certificate'] ?? new WP_Error('arbe_certificate_unavailable', 'Certificate unavailable.', ['status'=>404]);
}


function arbe_fp_rest_verify(WP_REST_Request $request) {
    $q = $request->get_param('id') ?: $request->get_param('sha256');
    if (!$q) return new WP_Error('arbe_missing_certificate_query', 'Provide certificate id or sha256.', ['status'=>400]);

    $row = arbe_fp_get_certificate_by_id_or_hash($q);
    if (!$row) return new WP_Error('arbe_certificate_not_found', 'Certificate not found in local registry.', ['status'=>404]);

    $verification = arbe_fp_verify_certificate_payload($row['payload']);
    $row['verification'] = $verification;
    return $row;
}


function arbe_fp_rest_certificate_json_export(WP_REST_Request $request) {
    $q = $request->get_param('id') ?: $request->get_param('sha256');
    if (!$q) return new WP_Error('arbe_missing_certificate_query', 'Provide certificate id or sha256.', ['status'=>400]);

    $row = arbe_fp_get_certificate_by_id_or_hash($q);
    if (!$row) return new WP_Error('arbe_certificate_not_found', 'Certificate not found in local registry.', ['status'=>404]);

    $response = new WP_REST_Response($row['payload']);
    $response->header('Content-Type', 'application/json; charset=utf-8');
    $response->header('Content-Disposition', 'attachment; filename="' . sanitize_file_name($row['certificate_id']) . '.json"');
    return $response;
}

function arbe_fp_rest_certificate_csv_export(WP_REST_Request $request) {
    $q = $request->get_param('id') ?: $request->get_param('sha256');
    if (!$q) return new WP_Error('arbe_missing_certificate_query', 'Provide certificate id or sha256.', ['status'=>400]);

    $row = arbe_fp_get_certificate_by_id_or_hash($q);
    if (!$row) return new WP_Error('arbe_certificate_not_found', 'Certificate not found in local registry.', ['status'=>404]);

    $p = $row['payload'];
    $cert = $p['certificate'] ?? [];
    $ref = $p['reference'] ?? [];
    $formula = $p['best_formula'] ?? [];
    $validation = $p['validation'] ?? [];
    $confidence = $p['confidence'] ?? [];

    $fields = [
        'certificate_id' => $cert['id'] ?? '',
        'batch_id' => $cert['batch_id'] ?? '',
        'sha256' => $cert['sha256'] ?? '',
        'verify_url' => $cert['verify_url'] ?? '',
        'fp_color_id' => $ref['fp_color_id'] ?? '',
        'reference_mode' => $ref['reference_mode'] ?? '',
        'formula' => $formula['label'] ?? '',
        'kernel' => $formula['kernel'] ?? '',
        'similarity' => $validation['similarity'] ?? '',
        'scissor' => $validation['scissor'] ?? '',
        'rmse' => $validation['rmse'] ?? '',
        'max_abs' => $validation['max_abs'] ?? '',
        'edge_area' => $validation['edge_area'] ?? '',
        'confidence_grade' => $confidence['confidence_grade'] ?? '',
        'confidence_score' => $confidence['confidence_score'] ?? '',
        'engine' => $p['engine'] ?? '',
        'version' => $p['version'] ?? '',
        'timestamp_utc' => $p['timestamp_utc'] ?? '',
    ];

    $csv = implode(',', array_map('arbe_fp_csv_escape', array_keys($fields))) . "\n";
    $csv .= implode(',', array_map('arbe_fp_csv_escape', array_values($fields))) . "\n";

    $response = new WP_REST_Response($csv);
    $response->header('Content-Type', 'text/csv; charset=utf-8');
    $response->header('Content-Disposition', 'attachment; filename="' . sanitize_file_name($row['certificate_id']) . '.csv"');
    return $response;
}

function arbe_fp_csv_escape($value) {
    $value = strval($value);
    $value = str_replace('"', '""', $value);
    return '"' . $value . '"';
}


function arbe_fp_rest_certificate_print_export(WP_REST_Request $request) {
    $q = $request->get_param('id') ?: $request->get_param('sha256');
    if (!$q) {
        status_header(400);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html><body><h1>Missing certificate id or sha256.</h1></body></html>';
        exit;
    }

    $row = arbe_fp_get_certificate_by_id_or_hash($q);
    if (!$row) {
        status_header(404);
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html><body><h1>Certificate not found in local registry.</h1></body></html>';
        exit;
    }

    $p = $row['payload'];
    $cert = $p['certificate'] ?? [];
    $ref = $p['reference'] ?? [];
    $formula = $p['best_formula'] ?? [];
    $validation = $p['validation'] ?? [];
    $confidence = $p['confidence'] ?? [];

    $html = '<!doctype html><html><head><meta charset="utf-8"><title>ARBE Certificate '.esc_html($row['certificate_id']).'</title>';
    $html .= '<style>
    body{font-family:Arial,sans-serif;margin:40px;color:#111827;background:#f3f4f6}
    .sheet{max-width:900px;margin:0 auto;background:#fff;border:1px solid #d1d5db;padding:32px;border-radius:18px}
    h1{margin:0 0 8px;font-size:28px}.kicker{text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:#475569;font-weight:bold}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}
    .box{border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#f9fafb}
    .box b{display:block;color:#475569;font-size:12px;text-transform:uppercase}.box strong{font-size:18px}
    table{width:100%;border-collapse:collapse;margin-top:20px}th,td{text-align:left;border-bottom:1px solid #e5e7eb;padding:9px;vertical-align:top}
    code{font-family:Menlo,monospace;font-size:12px;word-break:break-all}.qr{float:right;border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff}
    .note{margin-top:22px;background:#f9fafb;border-radius:12px;padding:14px;color:#374151}
    button{background:#0f172a;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:bold;cursor:pointer}
    @media print{body{margin:0;background:#fff}.sheet{border:0;border-radius:0}.no-print{display:none}}
    </style></head><body><div class="sheet">';
    $html .= '<div class="qr"><img width="130" height="130" src="'.esc_url($cert['qr_url'] ?? '').'" alt="QR"></div>';
    $html .= '<div class="kicker">ARBE FP Structural Solver Certificate</div>';
    $html .= '<h1>'.esc_html($cert['id'] ?? $row['certificate_id']).'</h1>';
    $html .= '<p><strong>Batch-ID:</strong> <code>'.esc_html($cert['batch_id'] ?? '').'</code></p>';
    $html .= '<div class="grid">';
    $html .= '<div class="box"><b>Reference</b><strong>'.esc_html($ref['fp_color_id'] ?? '').'</strong></div>';
    $html .= '<div class="box"><b>Best Formula</b><strong>'.esc_html($formula['label'] ?? '').'</strong></div>';
    $html .= '<div class="box"><b>Structural Similarity</b><strong>'.esc_html(number_format(floatval($validation['similarity'] ?? 0),2)).'%</strong></div>';
    $html .= '<div class="box"><b>Confidence</b><strong>'.esc_html(($confidence['confidence_grade'] ?? 'n/a').' / '.number_format(floatval($confidence['confidence_score'] ?? 0),1).'%').'</strong></div>';
    $html .= '</div><table><tbody>';

    $rows = [
        'SCISSOR'=>number_format(floatval($validation['scissor'] ?? 0),4),
        'RMSE'=>number_format(floatval($validation['rmse'] ?? 0),4),
        'Max Δ'=>number_format(floatval($validation['max_abs'] ?? 0),4),
        'Kernel'=>strtoupper($formula['kernel'] ?? ''),
        'Reference Mode'=>$ref['reference_mode'] ?? '',
        'Registry Status'=>$row['registry_status'],
        'Created'=>$row['created_at'],
        'Verify URL'=>$cert['verify_url'] ?? '',
        'SHA-256'=>$row['sha256'],
    ];

    foreach ($rows as $k=>$v) {
        $html .= '<tr><th>'.esc_html($k).'</th><td><code>'.esc_html($v).'</code></td></tr>';
    }

    $html .= '</tbody></table>';
    $html .= '<p class="note">This certificate validates the structural solver output and hash integrity. It does not replace batch-specific laboratory validation, legal manufacturer certification, or source-data quality review.</p>';
    $html .= '<p class="no-print"><button onclick="window.print()">Print / Save as PDF</button></p>';
    $html .= '</div></body></html>';

    status_header(200);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo $html;
    exit;
}

function arbe_fp_rest_health(WP_REST_Request $request) {
    return [
        'engine' => 'ARBE FP Structural Solver',
        'version' => ARBE_FP_SOLVER_VERSION,
        'status' => 'ok',
        'counts' => arbe_fp_solver_counts(),
    ];
}

?>