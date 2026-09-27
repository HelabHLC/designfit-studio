<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_Matcher {
    private static ?array $cache = null;

    public static function match(string $input_type, $value, array $request_context = []): array {
        if (!ARBE_HLC_DB::is_ready()) {
            throw new RuntimeException('Runtime master is not installed yet.');
        }

        $input_type = strtolower(trim($input_type));
        if ($input_type === 'hlc') {
            $reference = self::extract_reference((string) $value);
            if ($reference === null) {
                throw new InvalidArgumentException('Input format could not be parsed.');
            }

            $row = self::get_row_by_reference($reference);
            if ($row === null) {
                throw new RuntimeException('No valid Hxxx_Lxxx_Cxxx reference could be returned.');
            }

            return self::build_result($row, 'exact_reference', null, $input_type, (string) $value, $request_context);
        }

        $lab = match ($input_type) {
            'hex' => self::hex_to_lab((string) $value),
            'rgb' => self::rgb_to_lab((string) $value),
            'lab' => self::parse_lab((string) $value),
            default => null,
        };

        if ($lab === null) {
            throw new InvalidArgumentException('Input format could not be parsed.');
        }

        $rows = self::get_master_rows();
        $best = null;
        $bestDelta = INF;

        foreach ($rows as $row) {
            $delta = self::delta_e_2000(
                $lab['L'], $lab['a'], $lab['b'],
                (float) $row['lab_l'], (float) $row['lab_a'], (float) $row['lab_b']
            );

            if ($delta < $bestDelta - 1e-12) {
                $bestDelta = $delta;
                $best = $row;
            } elseif (abs($delta - $bestDelta) < 1e-12 && $best !== null) {
                if (strcmp($row['reference_id'], $best['reference_id']) < 0) {
                    $best = $row;
                }
            }
        }

        if ($best === null) {
            throw new RuntimeException('No valid Hxxx_Lxxx_Cxxx reference could be returned.');
        }

        return self::build_result($best, 'nearest_match', $bestDelta, $input_type, (string) $value, $request_context);
    }

    public static function health(): array {
        return [
            'status' => 'ok',
            'plugin_ready' => ARBE_HLC_DB::is_ready(),
            'install_state' => get_option('arbe_hlc_install_state', 'pending'),
            'master_version' => get_option('arbe_hlc_master_version', ARBE_HLC_MASTER_VERSION),
            'imported_rows' => ARBE_HLC_DB::count_rows(),
        ];
    }

    private static function get_master_rows(): array {
        if (self::$cache !== null) {
            return self::$cache;
        }

        global $wpdb;
        $table = ARBE_HLC_DB::table_name();
        $sql = "SELECT reference_id, lab_l, lab_a, lab_b, hex, rgb, lambda_v2_nm, lambda_ee_nm, delta_lambda_nm, mu2_nm2, sigma_star_nm, mu3_nm3, lambda_v2_method
                FROM {$table}
                WHERE atlas_identity_valid = 1 AND lambda_v2_method = 'Brent'";
        self::$cache = $wpdb->get_results($sql, ARRAY_A) ?: [];
        return self::$cache;
    }

    private static function get_row_by_reference(string $reference): ?array {
        global $wpdb;
        $table = ARBE_HLC_DB::table_name();
        $sql = $wpdb->prepare(
            "SELECT reference_id, lab_l, lab_a, lab_b, hex, rgb, lambda_v2_nm, lambda_ee_nm, delta_lambda_nm, mu2_nm2, sigma_star_nm, mu3_nm3, lambda_v2_method
             FROM {$table}
             WHERE reference_id = %s AND atlas_identity_valid = 1 AND lambda_v2_method = 'Brent' LIMIT 1",
            $reference
        );
        $row = $wpdb->get_row($sql, ARRAY_A);
        return $row ?: null;
    }

    private static function build_result(array $row, string $match_status, ?float $delta_e00 = null, string $input_type = '', string $input_value = '', array $request_context = []): array {
        $rgb = self::rgb_string_to_array((string) ($row['rgb'] ?? ''));
        $reference = $row['reference_id'];
        $fp = self::build_fp_code($row);

        $request_id = trim((string) ($request_context['request_id'] ?? ''));
        if ($request_id === '') {
            $request_id = 'REQ-' . gmdate('Ymd-His') . '-' . wp_generate_password(4, false, false);
        }

        $requested_at = trim((string) ($request_context['requested_at'] ?? ''));
        if ($requested_at === '') {
            $requested_at = current_time('mysql');
        }

        $result = [
            'status' => 'ok',
            'match_status' => $match_status,
            'reference_id' => $reference,
            'source_master_version' => get_option('arbe_hlc_master_version', ARBE_HLC_MASTER_VERSION),
            'fp_code' => $fp,
            'request_context' => [
                'customer_ref' => trim((string) ($request_context['customer_ref'] ?? '')),
                'request_id' => $request_id,
                'requested_at' => $requested_at,
            ],
            'input_request' => [
                'input_type' => strtolower(trim($input_type)),
                'input_value' => $input_value,
            ],
            'technical_validation' => [
                'input_interpretation' => 'request',
                'result_policy' => 'One validated atlas reference returned.',
                'identity_policy' => 'Reference identity is Hxxx_Lxxx_Cxxx only.',
                'matching_method' => $match_status === 'exact_reference' ? 'Exact reference lookup' : 'CIEDE2000 D50/2° against runtime master',
                'lambda_v2_method' => (string) ($row['lambda_v2_method'] ?? ''),
            ],
            'attributes' => [
                'hex' => $row['hex'],
                'rgb' => $rgb,
                'lab' => [
                    'L' => round((float) $row['lab_l'], 4),
                    'a' => round((float) $row['lab_a'], 4),
                    'b' => round((float) $row['lab_b'], 4),
                ],
                'lambda_v2_nm' => self::nullable_round($row['lambda_v2_nm']),
                'lambda_ee_nm' => self::nullable_round($row['lambda_ee_nm']),
                'delta_lambda_nm' => self::nullable_round($row['delta_lambda_nm']),
                'mu2_nm2' => self::nullable_round($row['mu2_nm2']),
                'sigma_star_nm' => self::nullable_round($row['sigma_star_nm']),
                'mu3_nm3' => self::nullable_round($row['mu3_nm3']),
            ],
        ];

        if ($delta_e00 !== null) {
            $result['delta_e00'] = round($delta_e00, 6);
        }

        return $result;
    }

    private static function build_fp_code(array $row): string {
        $reference = $row['reference_id'];
        $parts = explode('_', $reference);
        $h = $parts[0] ?? '';
        $l = $parts[1] ?? '';
        $c = $parts[2] ?? '';
        $rgb = self::rgb_string_to_array((string) ($row['rgb'] ?? ''));
        $rgbString = $rgb ? implode('_', $rgb) : '';
        $hex = $row['hex'] ?? '';

        $segments = [
            'FP',
            $reference,
            $h,
            $l,
            $c,
            'LabL_' . number_format((float) $row['lab_l'], 3, '.', ''),
            'a' . self::signed((float) $row['lab_a'], 3),
            'b' . self::signed((float) $row['lab_b'], 3),
        ];

        if ($row['lambda_v2_nm'] !== null) {
            $segments[] = 'λV2_' . number_format((float) $row['lambda_v2_nm'], 3, '.', '');
        }
        if ($row['lambda_ee_nm'] !== null) {
            $segments[] = 'λEE_' . number_format((float) $row['lambda_ee_nm'], 3, '.', '');
        }
        if ($row['delta_lambda_nm'] !== null) {
            $segments[] = 'Δλ_' . self::signed((float) $row['delta_lambda_nm'], 3);
        }
        if ($row['mu2_nm2'] !== null) {
            $segments[] = 'μ2_' . number_format((float) $row['mu2_nm2'], 3, '.', '');
        }
        if ($row['sigma_star_nm'] !== null) {
            $segments[] = 'σ_' . number_format((float) $row['sigma_star_nm'], 3, '.', '');
        }
        if ($row['mu3_nm3'] !== null) {
            $segments[] = 'μ3_' . self::signed((float) $row['mu3_nm3'], 3);
        }
        if ($hex) {
            $segments[] = 'HEX_' . strtoupper((string) $hex);
        }
        if ($rgbString) {
            $segments[] = 'RGB_' . $rgbString;
        }

        return implode('::', $segments);
    }

    private static function nullable_round($value): ?float {
        if ($value === null || $value === '') {
            return null;
        }
        return round((float) $value, 4);
    }

    private static function signed(float $value, int $decimals): string {
        $formatted = number_format(abs($value), $decimals, '.', '');
        return ($value >= 0 ? '+' : '-') . $formatted;
    }

    private static function extract_reference(string $value): ?string {
        $value = strtoupper(trim($value));
        if (preg_match('/^H\d{3}_L\d{3}_C\d{3}$/', $value)) {
            return $value;
        }
        if (preg_match('/^FP::(H\d{3}_L\d{3}_C\d{3})(?:::|$)/', $value, $m)) {
            return $m[1];
        }
        if (preg_match('/^FP1\|ID=(H\d{3}_L\d{3}_C\d{3})(?:\||$)/', $value, $m)) {
            return $m[1];
        }
        return null;
    }

    private static function parse_lab(string $value): ?array {
        if (preg_match('/^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/', trim($value), $m)) {
            return ['L' => (float) $m[1], 'a' => (float) $m[2], 'b' => (float) $m[3]];
        }
        return null;
    }

    private static function rgb_to_lab(string $value): ?array {
        $rgb = self::parse_rgb($value);
        if ($rgb === null) {
            return null;
        }
        return self::srgb_to_lab_d50($rgb[0], $rgb[1], $rgb[2]);
    }

    private static function hex_to_lab(string $hex): ?array {
        $hex = strtoupper(trim($hex));
        if (!preg_match('/^#?([0-9A-F]{6})$/', $hex, $m)) {
            return null;
        }
        $h = $m[1];
        $r = hexdec(substr($h, 0, 2));
        $g = hexdec(substr($h, 2, 2));
        $b = hexdec(substr($h, 4, 2));
        return self::srgb_to_lab_d50($r, $g, $b);
    }

    private static function parse_rgb(string $value): ?array {
        if (!preg_match('/^\s*(\d{1,3})\s*[,; ]\s*(\d{1,3})\s*[,; ]\s*(\d{1,3})\s*$/', trim($value), $m)) {
            return null;
        }
        $rgb = [(int) $m[1], (int) $m[2], (int) $m[3]];
        foreach ($rgb as $v) {
            if ($v < 0 || $v > 255) {
                return null;
            }
        }
        return $rgb;
    }

    private static function rgb_string_to_array(string $rgb): array {
        if (preg_match_all('/\d+/', $rgb, $m) && count($m[0]) >= 3) {
            return [(int) $m[0][0], (int) $m[0][1], (int) $m[0][2]];
        }
        return [];
    }

    private static function srgb_to_lab_d50(int $r, int $g, int $b): array {
        [$x65, $y65, $z65] = self::srgb_to_xyz_d65($r, $g, $b);
        [$x50, $y50, $z50] = self::xyz_d65_to_d50($x65, $y65, $z65);
        return self::xyz_to_lab_d50($x50, $y50, $z50);
    }

    private static function srgb_to_xyz_d65(int $r, int $g, int $b): array {
        $rgb = [$r / 255, $g / 255, $b / 255];
        foreach ($rgb as &$v) {
            $v = ($v <= 0.04045) ? ($v / 12.92) : pow(($v + 0.055) / 1.055, 2.4);
        }

        $x = $rgb[0] * 0.4124564 + $rgb[1] * 0.3575761 + $rgb[2] * 0.1804375;
        $y = $rgb[0] * 0.2126729 + $rgb[1] * 0.7151522 + $rgb[2] * 0.0721750;
        $z = $rgb[0] * 0.0193339 + $rgb[1] * 0.1191920 + $rgb[2] * 0.9503041;

        return [$x, $y, $z];
    }

    private static function xyz_d65_to_d50(float $x, float $y, float $z): array {
        $x50 = $x * 1.0479298 + $y * 0.0229468 + $z * -0.0501922;
        $y50 = $x * 0.0296278 + $y * 0.9904345 + $z * -0.0170738;
        $z50 = $x * -0.0092430 + $y * 0.0150552 + $z * 0.7518743;
        return [$x50, $y50, $z50];
    }

    private static function xyz_to_lab_d50(float $x, float $y, float $z): array {
        $xr = $x / 0.96422;
        $yr = $y / 1.00000;
        $zr = $z / 0.82521;

        $fx = self::lab_f($xr);
        $fy = self::lab_f($yr);
        $fz = self::lab_f($zr);

        return [
            'L' => max(0.0, 116.0 * $fy - 16.0),
            'a' => 500.0 * ($fx - $fy),
            'b' => 200.0 * ($fy - $fz),
        ];
    }

    private static function lab_f(float $t): float {
        $delta = 6 / 29;
        $delta3 = $delta ** 3;
        if ($t > $delta3) {
            return pow($t, 1 / 3);
        }
        return ($t / (3 * $delta * $delta)) + (4 / 29);
    }

    private static function delta_e_2000(float $L1, float $a1, float $b1, float $L2, float $a2, float $b2): float {
        $avgLp = ($L1 + $L2) / 2.0;
        $C1 = sqrt($a1 * $a1 + $b1 * $b1);
        $C2 = sqrt($a2 * $a2 + $b2 * $b2);
        $avgC = ($C1 + $C2) / 2.0;

        $G = 0.5 * (1 - sqrt(pow($avgC, 7) / (pow($avgC, 7) + pow(25.0, 7))));
        $a1p = (1 + $G) * $a1;
        $a2p = (1 + $G) * $a2;
        $C1p = sqrt($a1p * $a1p + $b1 * $b1);
        $C2p = sqrt($a2p * $a2p + $b2 * $b2);

        $h1p = self::hp_f($b1, $a1p);
        $h2p = self::hp_f($b2, $a2p);

        $dLp = $L2 - $L1;
        $dCp = $C2p - $C1p;

        if ($C1p * $C2p == 0) {
            $dhp = 0.0;
        } else {
            $dh = $h2p - $h1p;
            if ($dh > 180) {
                $dh -= 360;
            } elseif ($dh < -180) {
                $dh += 360;
            }
            $dhp = $dh;
        }

        $dHp = 2.0 * sqrt($C1p * $C2p) * sin(deg2rad($dhp / 2.0));
        $avgLpMinus50Sq = ($avgLp - 50.0) * ($avgLp - 50.0);
        $Sl = 1.0 + (0.015 * $avgLpMinus50Sq) / sqrt(20.0 + $avgLpMinus50Sq);
        $avgCp = ($C1p + $C2p) / 2.0;

        if ($C1p * $C2p == 0) {
            $avgHp = $h1p + $h2p;
        } else {
            $hDiff = abs($h1p - $h2p);
            if ($hDiff > 180) {
                $avgHp = ($h1p + $h2p + 360) / 2.0;
                if ($avgHp >= 360) {
                    $avgHp -= 360;
                }
            } else {
                $avgHp = ($h1p + $h2p) / 2.0;
            }
        }

        $T = 1
            - 0.17 * cos(deg2rad($avgHp - 30))
            + 0.24 * cos(deg2rad(2 * $avgHp))
            + 0.32 * cos(deg2rad(3 * $avgHp + 6))
            - 0.20 * cos(deg2rad(4 * $avgHp - 63));

        $Sc = 1.0 + 0.045 * $avgCp;
        $Sh = 1.0 + 0.015 * $avgCp * $T;

        $deltaTheta = 30.0 * exp(-1 * (($avgHp - 275.0) / 25.0) * (($avgHp - 275.0) / 25.0));
        $Rc = 2.0 * sqrt(pow($avgCp, 7) / (pow($avgCp, 7) + pow(25.0, 7)));
        $Rt = -sin(deg2rad(2.0 * $deltaTheta)) * $Rc;

        $dE = sqrt(
            pow($dLp / $Sl, 2) +
            pow($dCp / $Sc, 2) +
            pow($dHp / $Sh, 2) +
            $Rt * ($dCp / $Sc) * ($dHp / $Sh)
        );

        return $dE;
    }

    private static function hp_f(float $b, float $aPrime): float {
        if ($aPrime == 0.0 && $b == 0.0) {
            return 0.0;
        }
        $angle = rad2deg(atan2($b, $aPrime));
        return $angle >= 0 ? $angle : $angle + 360.0;
    }
}
