<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_confidence_grade($result, $source_quality='demo') {
    $similarity = floatval($result['similarity'] ?? 0);
    $components = count($result['formula'] ?? []);
    $penalty = 0.0;

    if ($source_quality === 'demo') $penalty += 8.0;
    if ($components >= 4) $penalty += 2.0;

    $score = max(0.0, min(100.0, $similarity - $penalty));

    if ($score >= 98) $grade = 'A+';
    elseif ($score >= 95) $grade = 'A';
    elseif ($score >= 90) $grade = 'B';
    elseif ($score >= 82) $grade = 'C';
    else $grade = 'D';

    return [
        'confidence_score'=>$score,
        'confidence_grade'=>$grade,
        'note'=>$source_quality === 'demo'
            ? 'Demo or synthetic source data lowers confidence.'
            : 'Confidence depends on source metadata and measured curve quality.',
    ];
}
?>