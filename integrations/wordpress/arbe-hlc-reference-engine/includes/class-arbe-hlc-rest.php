<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_REST {
    public static function init(): void {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
        add_action('wp_ajax_arbe_hlc_frontend_health', [__CLASS__, 'ajax_health']);
        add_action('wp_ajax_nopriv_arbe_hlc_frontend_health', [__CLASS__, 'ajax_health']);
        add_action('wp_ajax_arbe_hlc_frontend_match', [__CLASS__, 'ajax_match']);
        add_action('wp_ajax_nopriv_arbe_hlc_frontend_match', [__CLASS__, 'ajax_match']);
    }

    private static function base_match(string $input_type, $value, array $request_context): array {
        return ARBE_HLC_Matcher::match($input_type, $value, $request_context);
    }

    private static function clean_output_buffers(): void {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
    }

    public static function register_routes(): void {
        register_rest_route('arbe-hlc-reference/v1', '/health', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'health'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('arbe-hlc-reference/v1', '/match', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'match'],
            'permission_callback' => '__return_true',
            'args' => [
                'input_type' => ['required' => true, 'type' => 'string'],
                'value' => ['required' => true],
                'master_version' => ['required' => false, 'type' => 'string'],
                'customer_ref' => ['required' => false, 'type' => 'string'],
                'request_id' => ['required' => false, 'type' => 'string'],
                'requested_at' => ['required' => false, 'type' => 'string'],
            ],
        ]);
    }

    public static function ajax_health(): void {
        self::clean_output_buffers();

        if (!check_ajax_referer('arbe_hlc_frontend', 'nonce', false)) {
            wp_send_json([
                'status' => 'error',
                'error_code' => 'INVALID_NONCE',
                'message' => 'Security check failed.'
            ], 403);
        }

        wp_send_json(ARBE_HLC_Matcher::health(), 200);
    }

    public static function ajax_match(): void {
        self::clean_output_buffers();

        if (!check_ajax_referer('arbe_hlc_frontend', 'nonce', false)) {
            wp_send_json([
                'status' => 'error',
                'error_code' => 'INVALID_NONCE',
                'message' => 'Security check failed.'
            ], 403);
        }

        $input_type = isset($_POST['input_type']) ? sanitize_text_field(wp_unslash((string) $_POST['input_type'])) : '';
        $value = isset($_POST['value']) ? wp_unslash($_POST['value']) : null;
        $request_context = [
            'customer_ref' => isset($_POST['customer_ref']) ? sanitize_text_field(wp_unslash((string) $_POST['customer_ref'])) : '',
            'request_id' => isset($_POST['request_id']) ? sanitize_text_field(wp_unslash((string) $_POST['request_id'])) : '',
            'requested_at' => isset($_POST['requested_at']) ? sanitize_text_field(wp_unslash((string) $_POST['requested_at'])) : '',
        ];

        try {
            $result = self::base_match($input_type, $value, $request_context);
            wp_send_json($result, 200);
        } catch (InvalidArgumentException $e) {
            wp_send_json([
                'status' => 'error',
                'error_code' => 'INVALID_INPUT',
                'message' => $e->getMessage(),
            ], 400);
        } catch (RuntimeException $e) {
            $message = $e->getMessage();
            $code = str_contains($message, 'not installed')
                ? 'MASTER_NOT_READY'
                : 'NO_REFERENCE';
            wp_send_json([
                'status' => 'error',
                'error_code' => $code,
                'message' => $message,
            ], 409);
        } catch (Throwable $e) {
            wp_send_json([
                'status' => 'error',
                'error_code' => 'INVALID_RESULT',
                'message' => 'Result failed validation.',
            ], 500);
        }
    }

    public static function health(WP_REST_Request $request): WP_REST_Response {
        return new WP_REST_Response(ARBE_HLC_Matcher::health(), 200);
    }

    public static function match(WP_REST_Request $request): WP_REST_Response {
        $input_type = (string) $request->get_param('input_type');
        $value = $request->get_param('value');

        $request_context = [
            'customer_ref' => sanitize_text_field((string) $request->get_param('customer_ref')),
            'request_id' => sanitize_text_field((string) $request->get_param('request_id')),
            'requested_at' => sanitize_text_field((string) $request->get_param('requested_at')),
        ];

        try {
            $result = self::base_match($input_type, $value, $request_context);
            return new WP_REST_Response($result, 200);
        } catch (InvalidArgumentException $e) {
            return new WP_REST_Response([
                'status' => 'error',
                'error_code' => 'INVALID_INPUT',
                'message' => $e->getMessage(),
            ], 400);
        } catch (RuntimeException $e) {
            $message = $e->getMessage();
            $code = str_contains($message, 'not installed')
                ? 'MASTER_NOT_READY'
                : 'NO_REFERENCE';
            return new WP_REST_Response([
                'status' => 'error',
                'error_code' => $code,
                'message' => $message,
            ], 409);
        } catch (Throwable $e) {
            return new WP_REST_Response([
                'status' => 'error',
                'error_code' => 'INVALID_RESULT',
                'message' => 'Result failed validation.',
            ], 500);
        }
    }
}
