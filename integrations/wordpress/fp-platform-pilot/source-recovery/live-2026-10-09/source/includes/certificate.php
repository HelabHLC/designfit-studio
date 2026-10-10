<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_certificate_payload($solve_result) {
    $best = $solve_result['solutions'][0] ?? null;
    if (!$best) return null;

    $payload = [
        'engine' => $solve_result['engine'] ?? 'ARBE FP Structural Solver',
        'version' => $solve_result['version'] ?? ARBE_FP_SOLVER_VERSION,
        'timestamp_utc' => gmdate('c'),
        'reference' => [
            'fp_color_id' => $solve_result['fp_color']['id'] ?? '',
            'name' => $solve_result['fp_color']['name'] ?? '',
            'hex' => $solve_result['fp_color']['hex'] ?? '',
            'reference_mode' => $solve_result['reference_mode'] ?? 'unknown',
            'psf' => $solve_result['fp_color']['psf'] ?? [],
        ],
        'best_formula' => [
            'label' => $best['formula_label'] ?? arbe_fp_formula_label($best['formula'] ?? []),
            'type' => $best['type'] ?? '',
            'kernel' => $best['kernel'] ?? 'km',
            'components' => $best['formula'] ?? [],
        ],
        'validation' => [
            'similarity' => floatval($best['similarity'] ?? 0),
            'scissor' => floatval($best['scissor'] ?? 0),
            'rmse' => floatval($best['rmse'] ?? 0),
            'max_abs' => floatval($best['max_abs'] ?? 0),
            'edge_area' => floatval($best['edge_area'] ?? 0),
        ],
        'confidence' => $best['confidence'] ?? [],
        'settings' => $solve_result['settings'] ?? [],
        'notice' => 'Certificate validates structural solver output, not legal identity of a commercial pigment batch. Source data quality must be checked.',
    ];

    $canonical = arbe_fp_certificate_canonical_json($payload);
    $hash = hash('sha256', $canonical);
    $certificate_id = 'ARBE-FP-' . substr(strtoupper($hash), 0, 16);
    $batch_id = 'BATCH-' . gmdate('Ymd-His') . '-' . substr(strtoupper($hash), 0, 8);
    $verify_url = rest_url('arbe/v1/verify?id=' . rawurlencode($certificate_id));
    $qr_url = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . rawurlencode($verify_url);

    $payload['certificate'] = [
        'id' => $certificate_id,
        'batch_id' => $batch_id,
        'sha256' => $hash,
        'verify_url' => $verify_url,
        'qr_url' => $qr_url,
        'registry_status' => 'local_registered',
    ];

    return $payload;
}

function arbe_fp_certificate_canonical_json($payload) {
    return wp_json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}


function arbe_fp_register_certificate($cert) {
    if (!$cert || empty($cert['certificate']['id']) || empty($cert['certificate']['sha256'])) return false;

    global $wpdb;
    $table = $wpdb->prefix . 'arbe_fp_certificates';

    $best = $cert['best_formula'] ?? [];
    $val = $cert['validation'] ?? [];
    $conf = $cert['confidence'] ?? [];
    $ref = $cert['reference'] ?? [];

    $data = [
        'certificate_id'=>$cert['certificate']['id'],
        'batch_id'=>$cert['certificate']['batch_id'] ?? '',
        'sha256'=>$cert['certificate']['sha256'],
        'fp_color_id'=>$ref['fp_color_id'] ?? '',
        'formula_label'=>$best['label'] ?? '',
        'similarity'=>floatval($val['similarity'] ?? 0),
        'confidence_grade'=>$conf['confidence_grade'] ?? '',
        'confidence_score'=>floatval($conf['confidence_score'] ?? 0),
        'scissor'=>floatval($val['scissor'] ?? 0),
        'kernel'=>$best['kernel'] ?? '',
        'reference_mode'=>$ref['reference_mode'] ?? '',
        'payload'=>wp_json_encode($cert, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        'registry_status'=>'local_registered',
    ];

    $existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE certificate_id=%s OR sha256=%s", $data['certificate_id'], $data['sha256']));
    if ($existing) {
        $wpdb->update($table, $data, ['id'=>intval($existing)]);
    } else {
        $wpdb->insert($table, $data);
    }
    arbe_fp_audit_log('certificate_registered', [
        'object_type'=>'certificate',
        'object_id'=>$data['certificate_id'],
        'fp_color_id'=>$data['fp_color_id'],
        'payload'=>[
            'sha256'=>$data['sha256'],
            'formula'=>$data['formula_label'],
            'similarity'=>$data['similarity'],
            'confidence_grade'=>$data['confidence_grade'],
        ],
    ]);
    return true;
}

function arbe_fp_get_certificate_by_id_or_hash($id_or_hash) {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_fp_certificates';
    $q = trim(strval($id_or_hash));
    if (!$q) return null;

    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM $table WHERE certificate_id=%s OR sha256=%s",
        $q,
        strtolower($q)
    ));

    if (!$row) return null;
    $payload = json_decode($row->payload, true);
    return [
        'found'=>true,
        'certificate_id'=>$row->certificate_id,
        'sha256'=>$row->sha256,
        'registry_status'=>$row->registry_status,
        'created_at'=>$row->created_at,
        'payload'=>$payload,
    ];
}

function arbe_fp_verify_certificate_payload($cert) {
    if (!$cert || empty($cert['certificate']['sha256'])) {
        return ['valid'=>false, 'reason'=>'missing_hash'];
    }

    $given_hash = $cert['certificate']['sha256'];
    $copy = $cert;
    unset($copy['certificate']);

    $canonical = arbe_fp_certificate_canonical_json($copy);
    $recalc = hash('sha256', $canonical);

    return [
        'valid'=>hash_equals($given_hash, $recalc),
        'given_sha256'=>$given_hash,
        'recalculated_sha256'=>$recalc,
    ];
}


function arbe_fp_render_certificate($solve_result) {
    $cert = arbe_fp_certificate_payload($solve_result);
    if (!$cert) return '';
    arbe_fp_register_certificate($cert);

    $best = $cert['best_formula'];
    $val = $cert['validation'];
    $conf = $cert['confidence'];
    $reference = $cert['reference'];

    ob_start();
    echo '<section class="arbe-cert">';
    echo '<span class="arbe-kicker">ARBE Solver Certificate</span>';
    echo '<div class="arbe-cert-head"><div><h3>'.esc_html($cert['certificate']['id']).'</h3><p><strong>Batch-ID:</strong> <code>'.esc_html($cert['certificate']['batch_id'] ?? '').'</code></p></div><div class="arbe-cert-qr"><img src="'.esc_url($cert['certificate']['qr_url'] ?? '').'" alt="Certificate verification QR"></div></div>';
    echo '<div class="arbe-cert-grid">';
    echo '<div><b>Reference</b><strong>'.esc_html($reference['fp_color_id']).'</strong></div>';
    echo '<div><b>Best Formula</b><strong>'.esc_html($best['label']).'</strong></div>';
    echo '<div><b>Similarity</b><strong>'.esc_html(number_format($val['similarity'], 2)).'%</strong></div>';
    echo '<div><b>Confidence</b><strong>'.esc_html(($conf['confidence_grade'] ?? 'n/a') . ' / ' . number_format(floatval($conf['confidence_score'] ?? 0), 1) . '%').'</strong></div>';
    echo '</div>';
    echo '<table class="arbe-table"><tbody>';
    echo '<tr><th>SCISSOR</th><td>'.esc_html(number_format($val['scissor'], 4)).'</td></tr>';
    echo '<tr><th>RMSE</th><td>'.esc_html(number_format($val['rmse'], 4)).'</td></tr>';
    echo '<tr><th>Max Δ</th><td>'.esc_html(number_format($val['max_abs'], 4)).'</td></tr>';
    echo '<tr><th>Kernel</th><td><code>'.esc_html(strtoupper($best['kernel'])).'</code></td></tr>';
    echo '<tr><th>Reference Mode</th><td><code>'.esc_html($reference['reference_mode']).'</code></td></tr>';
    echo '<tr><th>Batch-ID</th><td><code>'.esc_html($cert['certificate']['batch_id'] ?? '').'</code></td></tr>';
    echo '<tr><th>Verify URL</th><td><code>'.esc_html($cert['certificate']['verify_url'] ?? '').'</code></td></tr>';
    echo '<tr><th>SHA-256</th><td><code>'.esc_html($cert['certificate']['sha256']).'</code></td></tr>';
    echo '</tbody></table>';
    echo '<details class="arbe-cert-json"><summary>Show certificate JSON</summary><pre>'.esc_html(wp_json_encode($cert, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)).'</pre></details>';
    echo '<p class="arbe-note">'.esc_html($cert['notice']).'</p>';
    echo '</section>';
    return ob_get_clean();
}
?>