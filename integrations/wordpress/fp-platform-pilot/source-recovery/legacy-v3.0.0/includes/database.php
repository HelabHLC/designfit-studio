<?php
if (!defined('ABSPATH')) { exit; }

function arbe_fp_solver_create_tables() {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();

    $colors = $wpdb->prefix . 'arbe_fp_color_master';
    $pigments = $wpdb->prefix . 'arbe_fp_pigments';
    $curves = $wpdb->prefix . 'arbe_fp_pigment_curves';
    $sources = $wpdb->prefix . 'arbe_fp_pigment_sources';
    $refcurves = $wpdb->prefix . 'arbe_fp_color_curves';
    $certs = $wpdb->prefix . 'arbe_fp_certificates';

    dbDelta("CREATE TABLE $colors (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        fp_color_id VARCHAR(128) NOT NULL,
        color_name VARCHAR(255) NULL,
        hex_value VARCHAR(16) NULL,
        rgb_value VARCHAR(64) NULL,
        lab_l DOUBLE NULL,
        lab_a DOUBLE NULL,
        lab_b DOUBLE NULL,
        psf_p1_nm SMALLINT UNSIGNED NOT NULL,
        psf_p1_r DOUBLE NOT NULL,
        psf_p2_nm SMALLINT UNSIGNED NOT NULL,
        psf_p2_r DOUBLE NOT NULL,
        psf_p3_nm SMALLINT UNSIGNED NOT NULL,
        psf_p3_r DOUBLE NOT NULL,
        psf_p4_nm SMALLINT UNSIGNED NOT NULL,
        psf_p4_r DOUBLE NOT NULL,
        source_status VARCHAR(64) DEFAULT 'master',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY fp_color_unique (fp_color_id)
    ) $charset;");

    dbDelta("CREATE TABLE $pigments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        pigment_code VARCHAR(64) NOT NULL,
        pigment_name VARCHAR(255) NULL,
        pigment_family VARCHAR(128) NULL,
        source_id VARCHAR(128) NULL,
        source_name VARCHAR(255) NULL,
        source_url TEXT NULL,
        curve_status VARCHAR(64) DEFAULT 'imported',
        lambda_v2 DOUBLE NULL,
        lambda_ee DOUBLE NULL,
        delta_lambda DOUBLE NULL,
        mu2 DOUBLE NULL,
        sigma_star DOUBLE NULL,
        mu3 DOUBLE NULL,
        psf_p1_nm SMALLINT UNSIGNED NULL,
        psf_p1_r DOUBLE NULL,
        psf_p2_nm SMALLINT UNSIGNED NULL,
        psf_p2_r DOUBLE NULL,
        psf_p3_nm SMALLINT UNSIGNED NULL,
        psf_p3_r DOUBLE NULL,
        psf_p4_nm SMALLINT UNSIGNED NULL,
        psf_p4_r DOUBLE NULL,
        fp_pigment TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY pigment_code_unique (pigment_code),
        KEY family_idx (pigment_family),
        KEY source_idx (source_id)
    ) $charset;");

    dbDelta("CREATE TABLE $curves (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        pigment_id BIGINT UNSIGNED NOT NULL,
        wavelength_nm SMALLINT UNSIGNED NOT NULL,
        remission DOUBLE NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY pigment_wavelength_unique (pigment_id, wavelength_nm),
        KEY wavelength_idx (wavelength_nm)
    ) $charset;");

    dbDelta("CREATE TABLE $sources (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        source_id VARCHAR(128) NOT NULL,
        source_name VARCHAR(255) NULL,
        source_url TEXT NULL,
        license_or_terms TEXT NULL,
        measurement_geometry VARCHAR(255) NULL,
        wavelength_range VARCHAR(128) NULL,
        wavelength_step VARCHAR(128) NULL,
        notes TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY source_id_unique (source_id)
    ) $charset;");

    dbDelta("CREATE TABLE $refcurves (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        color_id BIGINT UNSIGNED NOT NULL,
        wavelength_nm SMALLINT UNSIGNED NOT NULL,
        remission DOUBLE NOT NULL,
        curve_status VARCHAR(64) DEFAULT 'measured',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY color_wavelength_unique (color_id, wavelength_nm),
        KEY wavelength_idx (wavelength_nm),
        KEY color_idx (color_id)
    ) $charset;");

    dbDelta("CREATE TABLE $certs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        certificate_id VARCHAR(64) NOT NULL,
        batch_id VARCHAR(96) NULL,
        sha256 CHAR(64) NOT NULL,
        fp_color_id VARCHAR(128) NOT NULL,
        formula_label TEXT NULL,
        similarity DOUBLE NULL,
        confidence_grade VARCHAR(16) NULL,
        confidence_score DOUBLE NULL,
        scissor DOUBLE NULL,
        kernel VARCHAR(32) NULL,
        reference_mode VARCHAR(64) NULL,
        payload LONGTEXT NOT NULL,
        registry_status VARCHAR(64) DEFAULT 'local_registered',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY certificate_id_unique (certificate_id),
        UNIQUE KEY sha256_unique (sha256),
        KEY fp_color_idx (fp_color_id)
    ) $charset;");
}

function arbe_fp_solver_counts() {
    global $wpdb;
    return [
        'colors' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_color_master")),
        'pigments' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_pigments")),
        'curves' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_pigment_curves")),
        'sources' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_pigment_sources")),
        'reference_curve_points' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_color_curves")),
        'certificates' => intval($wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}arbe_fp_certificates")),
    ];
}

function arbe_fp_solver_seed_color_master() {
    global $wpdb;
    $table = $wpdb->prefix . 'arbe_fp_color_master';
    $rows = [
        ['H095_L090_C105','Demo reference yellow','#F5E500','245,229,0',90,-9.1514,104.6004,450,0.0670,525,0.5295,560,0.8330,730,0.9520,'demo_master'],
        ['H090_L085_C110','Demo golden yellow','#F5D200','245,210,0',85,0,110,450,0.0500,515,0.4820,555,0.8150,730,0.9400,'demo_master'],
    ];
    foreach ($rows as $r) {
        $exists = $wpdb->get_var($wpdb->prepare("SELECT id FROM $table WHERE fp_color_id=%s", $r[0]));
        if ($exists) continue;
        $wpdb->insert($table, [
            'fp_color_id'=>$r[0], 'color_name'=>$r[1], 'hex_value'=>$r[2], 'rgb_value'=>$r[3],
            'lab_l'=>$r[4], 'lab_a'=>$r[5], 'lab_b'=>$r[6],
            'psf_p1_nm'=>$r[7], 'psf_p1_r'=>$r[8], 'psf_p2_nm'=>$r[9], 'psf_p2_r'=>$r[10],
            'psf_p3_nm'=>$r[11], 'psf_p3_r'=>$r[12], 'psf_p4_nm'=>$r[13], 'psf_p4_r'=>$r[14],
            'source_status'=>$r[15]
        ]);
    }
}

function arbe_fp_get_color($fp_color_id) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arbe_fp_color_master WHERE fp_color_id=%s",
        strtoupper(trim($fp_color_id))
    ));
}

function arbe_fp_get_pigments($limit = 1000) {
    global $wpdb;
    return $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arbe_fp_pigments WHERE psf_p1_nm IS NOT NULL ORDER BY pigment_code ASC LIMIT %d",
        $limit
    ));
}

function arbe_fp_get_pigment($code) {
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}arbe_fp_pigments WHERE pigment_code=%s",
        strtoupper(trim($code))
    ));
}

function arbe_fp_get_curve($pigment_id) {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT wavelength_nm, remission FROM {$wpdb->prefix}arbe_fp_pigment_curves WHERE pigment_id=%d ORDER BY wavelength_nm ASC",
        $pigment_id
    ));
    $curve = [];
    foreach ($rows as $r) $curve[intval($r->wavelength_nm)] = floatval($r->remission);
    return $curve;
}

function arbe_fp_normalize_remission($value) {
    if ($value > 1.5) $value = $value / 100.0;
    return max(0.0, min(1.0, floatval($value)));
}

function arbe_fp_save_pigment_curve($entry) {
    global $wpdb;
    $pigments = $wpdb->prefix . 'arbe_fp_pigments';
    $curves = $wpdb->prefix . 'arbe_fp_pigment_curves';
    ksort($entry['curve']);

    $metrics = arbe_fp_curve_metrics($entry['curve']);
    $psf = arbe_fp_extract_4psf($entry['curve']);

    $fp = sprintf(
        'FP-Pigment::%s::4PSF_%d:%0.4f|%d:%0.4f|%d:%0.4f|%d:%0.4f::λV2_%0.3f::λEE_%0.3f::Δλ_%0.3f::μ2_%0.3f::σ_%0.3f::μ3_%0.3f',
        $entry['pigment_code'],
        $psf[0]['nm'], $psf[0]['r'], $psf[1]['nm'], $psf[1]['r'], $psf[2]['nm'], $psf[2]['r'], $psf[3]['nm'], $psf[3]['r'],
        $metrics['lambda_v2'], $metrics['lambda_ee'], $metrics['delta_lambda'], $metrics['mu2'], $metrics['sigma_star'], $metrics['mu3']
    );

    $data = [
        'pigment_code'=>strtoupper($entry['pigment_code']),
        'pigment_name'=>$entry['pigment_name'] ?? '',
        'pigment_family'=>$entry['pigment_family'] ?? '',
        'source_id'=>$entry['source_id'] ?? '',
        'source_name'=>$entry['source_name'] ?? '',
        'source_url'=>$entry['source_url'] ?? '',
        'curve_status'=>$entry['curve_status'] ?? 'imported',
        'lambda_v2'=>$metrics['lambda_v2'],
        'lambda_ee'=>$metrics['lambda_ee'],
        'delta_lambda'=>$metrics['delta_lambda'],
        'mu2'=>$metrics['mu2'],
        'sigma_star'=>$metrics['sigma_star'],
        'mu3'=>$metrics['mu3'],
        'psf_p1_nm'=>$psf[0]['nm'], 'psf_p1_r'=>$psf[0]['r'],
        'psf_p2_nm'=>$psf[1]['nm'], 'psf_p2_r'=>$psf[1]['r'],
        'psf_p3_nm'=>$psf[2]['nm'], 'psf_p3_r'=>$psf[2]['r'],
        'psf_p4_nm'=>$psf[3]['nm'], 'psf_p4_r'=>$psf[3]['r'],
        'fp_pigment'=>$fp,
    ];

    $existing = $wpdb->get_var($wpdb->prepare("SELECT id FROM $pigments WHERE pigment_code=%s", $data['pigment_code']));
    if ($existing) {
        $wpdb->update($pigments, $data, ['id'=>intval($existing)]);
        $pid = intval($existing);
        $wpdb->delete($curves, ['pigment_id'=>$pid]);
    } else {
        $wpdb->insert($pigments, $data);
        $pid = intval($wpdb->insert_id);
    }

    foreach ($entry['curve'] as $wl=>$r) {
        $wpdb->insert($curves, ['pigment_id'=>$pid, 'wavelength_nm'=>intval($wl), 'remission'=>floatval($r)]);
    }
}

function arbe_fp_curve_metrics($curve) {
    $sum_r=0.0; $sum_wr=0.0;
    foreach ($curve as $wl=>$r) { $sum_r += $r; $sum_wr += $wl*$r; }
    $mu = $sum_r > 0 ? $sum_wr/$sum_r : 0.0;

    $mu2=0.0; $mu3=0.0;
    foreach ($curve as $wl=>$r) {
        $d = $wl - $mu;
        $mu2 += $d*$d*$r;
        $mu3 += $d*$d*$d*$r;
    }
    $mu2 = $sum_r > 0 ? $mu2/$sum_r : 0.0;
    $mu3 = $sum_r > 0 ? $mu3/$sum_r : 0.0;

    $wls = array_keys($curve); sort($wls);
    $energy_sum=0.0; $energy_w_sum=0.0;
    for ($i=1; $i<count($wls); $i++) {
        $wl0=$wls[$i-1]; $wl1=$wls[$i]; $step=max(1,$wl1-$wl0);
        $grad = abs(($curve[$wl1]-$curve[$wl0])/$step);
        $mid = ($wl0+$wl1)/2.0;
        $energy_sum += $grad;
        $energy_w_sum += $mid*$grad;
    }
    $lambda_ee = $energy_sum > 0 ? $energy_w_sum/$energy_sum : $mu;

    return [
        'lambda_v2'=>$mu,
        'lambda_ee'=>$lambda_ee,
        'delta_lambda'=>$mu-$lambda_ee,
        'mu2'=>$mu2,
        'sigma_star'=>sqrt(max(0.0,$mu2)),
        'mu3'=>$mu3,
    ];
}

function arbe_fp_extract_4psf($curve) {
    ksort($curve);
    $wls = array_keys($curve);
    $vals = array_values($curve);
    $min = min($vals); $max = max($vals); $span = max(0.000001, $max-$min);
    $r10 = $min + 0.10*$span;
    $r90 = $min + 0.90*$span;
    $rising = end($vals) >= $vals[0];

    $p1 = ['nm'=>$wls[0], 'r'=>$vals[0]];
    $p3 = ['nm'=>end($wls), 'r'=>end($vals)];
    $p4_idx = array_search($max, $vals, true);
    $p4 = ['nm'=>$wls[$p4_idx], 'r'=>$vals[$p4_idx]];

    for ($i=0; $i<count($wls); $i++) {
        if (($rising && $vals[$i] >= $r10) || (!$rising && $vals[$i] <= ($max - 0.10*$span))) {
            $p1 = ['nm'=>$wls[$i], 'r'=>$vals[$i]]; break;
        }
    }
    for ($i=0; $i<count($wls); $i++) {
        if (($rising && $vals[$i] >= $r90) || (!$rising && $vals[$i] <= ($max - 0.90*$span))) {
            $p3 = ['nm'=>$wls[$i], 'r'=>$vals[$i]]; break;
        }
    }

    $best_slope=-1.0; $p2=$p1;
    for ($i=1; $i<count($wls); $i++) {
        $step=max(1,$wls[$i]-$wls[$i-1]);
        $slope=abs(($vals[$i]-$vals[$i-1])/$step);
        if ($slope > $best_slope) {
            $best_slope=$slope;
            $p2=['nm'=>intval(($wls[$i]+$wls[$i-1])/2), 'r'=>($vals[$i]+$vals[$i-1])/2.0];
        }
    }

    return [
        ['nm'=>intval($p1['nm']), 'r'=>round($p1['r'],4)],
        ['nm'=>intval($p2['nm']), 'r'=>round($p2['r'],4)],
        ['nm'=>intval($p3['nm']), 'r'=>round($p3['r'],4)],
        ['nm'=>intval($p4['nm']), 'r'=>round($p4['r'],4)],
    ];
}

function arbe_fp_seed_demo_pigments() {
    $wls = range(380, 730, 10);
    $defs = [
        ['PY150','Nickel Azo Yellow','yellow',525,22,0.08,0.86,-0.05,430,28],
        ['PY74','Arylide Yellow','yellow',500,18,0.10,0.82,-0.08,445,35],
        ['PY154','Benzimidazolone Yellow','yellow',515,20,0.09,0.84,-0.04,430,32],
        ['PY3','Hansa Yellow Light','yellow',485,17,0.12,0.78,-0.07,440,25],
        ['PY42','Synthetic Yellow Iron Oxide','earth yellow',500,32,0.16,0.62,-0.02,420,45],
        ['PR122','Quinacridone Magenta','red/magenta',615,42,0.12,0.38,-0.12,530,35],
        ['PR254','Diketopyrrolopyrrole Red','red',590,28,0.10,0.50,-0.14,510,30],
        ['PB29','Ultramarine Blue','blue',455,-38,0.12,0.48,-0.08,580,60],
        ['PB15:3','Phthalo Blue Green Shade','blue',470,-30,0.08,0.55,-0.06,610,70],
        ['PG7','Phthalocyanine Green','green',525,-36,0.08,0.52,-0.08,430,35],
        ['PG36','Phthalocyanine Green YS','green',545,-32,0.10,0.50,-0.06,440,35],
        ['PW6','Titanium White','white',0,0,0.88,0.00,0.00,0,1],
    ];

    foreach ($defs as $d) {
        [$code,$name,$family,$edge,$k,$base,$amp,$dip,$dip_mu,$dip_sig] = $d;
        $curve = [];
        foreach ($wls as $wl) {
            if ($code === 'PW6') {
                $r = 0.86 + 0.04 * sin(($wl - 380) / 70.0);
            } elseif (in_array($family, ['blue','green','red/magenta','red'], true)) {
                if ($family === 'blue') $r = $base + $amp * exp(-0.5 * pow(($wl - abs($edge))/38,2)) + 0.08 * exp(-0.5 * pow(($wl - 700)/90,2)) + $dip * exp(-0.5 * pow(($wl - $dip_mu)/$dip_sig,2));
                elseif ($family === 'green') $r = $base + $amp * exp(-0.5 * pow(($wl - $edge)/45,2)) + 0.10 * exp(-0.5 * pow(($wl - 650)/80,2)) + $dip * exp(-0.5 * pow(($wl - $dip_mu)/$dip_sig,2));
                else $r = $base + $amp * exp(-0.5 * pow(($wl - $edge)/45,2)) + 0.12 * exp(-0.5 * pow(($wl - 700)/55,2)) + $dip * exp(-0.5 * pow(($wl - $dip_mu)/$dip_sig,2));
            } else {
                $sig = 1.0/(1.0+exp(-($wl-$edge)/max(1,$k)));
                $r = $base + $amp*$sig + $dip*exp(-0.5*pow(($wl-$dip_mu)/max(1,$dip_sig),2));
            }
            $curve[$wl] = max(0.0, min(1.0, round($r,4)));
        }
        arbe_fp_save_pigment_curve([
            'pigment_code'=>$code, 'pigment_name'=>$name, 'pigment_family'=>$family,
            'source_id'=>'DEMO_SYNTHETIC', 'source_name'=>'ARBE synthetic demo library',
            'curve_status'=>'demo_not_validated', 'curve'=>$curve
        ]);
    }
}

function arbe_fp_get_color_curve($color_id) {
    global $wpdb;
    $rows = $wpdb->get_results($wpdb->prepare(
        "SELECT wavelength_nm, remission FROM {$wpdb->prefix}arbe_fp_color_curves WHERE color_id=%d ORDER BY wavelength_nm ASC",
        intval($color_id)
    ));
    $curve = [];
    foreach ($rows as $r) $curve[intval($r->wavelength_nm)] = floatval($r->remission);
    return $curve;
}

function arbe_fp_get_reference_curve_for_color($color, $wavelengths) {
    $measured = arbe_fp_get_color_curve($color->id);
    if ($measured) {
        return arbe_fp_resample_curve($measured, $wavelengths);
    }
    return arbe_fp_reference_curve_from_color($color, $wavelengths);
}

function arbe_fp_resample_curve($curve, $wavelengths) {
    ksort($curve);
    $src_wls = array_keys($curve);
    $src_vals = array_values($curve);
    $out = [];

    foreach ($wavelengths as $wl) {
        if (isset($curve[$wl])) {
            $out[$wl] = $curve[$wl];
            continue;
        }
        if ($wl <= $src_wls[0]) {
            $out[$wl] = $src_vals[0];
        } elseif ($wl >= $src_wls[count($src_wls)-1]) {
            $out[$wl] = $src_vals[count($src_vals)-1];
        } else {
            for ($i=1; $i<count($src_wls); $i++) {
                if ($wl <= $src_wls[$i]) {
                    $x0=$src_wls[$i-1]; $x1=$src_wls[$i];
                    $y0=$src_vals[$i-1]; $y1=$src_vals[$i];
                    $t=($wl-$x0)/max(1,($x1-$x0));
                    $out[$wl] = $y0 + $t*($y1-$y0);
                    break;
                }
            }
        }
    }
    return $out;
}

function arbe_fp_save_color_curve($fp_color_id, $curve, $status='measured') {
    global $wpdb;
    $color = arbe_fp_get_color($fp_color_id);
    if (!$color) return false;

    $table = $wpdb->prefix . 'arbe_fp_color_curves';
    $wpdb->delete($table, ['color_id'=>intval($color->id)]);

    foreach ($curve as $wl=>$r) {
        $wpdb->insert($table, [
            'color_id'=>intval($color->id),
            'wavelength_nm'=>intval($wl),
            'remission'=>arbe_fp_normalize_remission($r),
            'curve_status'=>$status
        ]);
    }
    return true;
}

?>