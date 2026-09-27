<?php
if (!defined('ABSPATH')) {
    exit;
}

class ARBE_HLC_Shortcode {
    public static function init(): void {
        add_shortcode('arbe_hlc_reference_tool', [__CLASS__, 'render']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
    }

    public static function enqueue_assets(): void {
        wp_register_style(
            'arbe-hlc-reference-engine',
            ARBE_HLC_PLUGIN_URL . 'assets/css/frontend.css',
            [],
            ARBE_HLC_PLUGIN_VERSION
        );

        wp_register_script(
            'arbe-hlc-reference-engine',
            ARBE_HLC_PLUGIN_URL . 'assets/js/frontend.js',
            [],
            ARBE_HLC_PLUGIN_VERSION,
            true
        );

        wp_localize_script('arbe-hlc-reference-engine', 'ARBE_HLC_CONFIG', [
            'restUrl' => esc_url_raw(rest_url('arbe-hlc-reference/v1')),
            'healthUrl' => esc_url_raw(rest_url('arbe-hlc-reference/v1/health')),
            'matchUrl' => esc_url_raw(rest_url('arbe-hlc-reference/v1/match')),
            'ajaxUrl' => esc_url_raw(admin_url('admin-ajax.php')),
            'ajaxNonce' => wp_create_nonce('arbe_hlc_frontend'),
        ]);
    }

    public static function render(): string {
        wp_enqueue_style('arbe-hlc-reference-engine');
        wp_enqueue_script('arbe-hlc-reference-engine');

        ob_start();
        ?>
        <div class="arbe-hlc-tool" data-arbe-hlc-tool>
            <div class="arbe-hlc-card">
                <div class="arbe-hlc-eyebrow">ARBE HLC Reference Engine</div>
                <h2>Input request in. One validated reference card out.</h2>
                <p class="arbe-hlc-lead">Inputs are treated as requests, not results. HEX, RGB and Lab use D50/2° ΔE00 against this engine's installed master; exact HLC and FP requests look up the stated reference. This is separate from the frozen PKL RGB-only pixel binding.</p>

                <div class="arbe-hlc-grid arbe-hlc-grid-context">
                    <label>
                        <span>Customer ref</span>
                        <input type="text" data-arbe-customer-ref placeholder="Customer / project reference">
                    </label>

                    <label>
                        <span>Request ID</span>
                        <input type="text" data-arbe-request-id placeholder="Auto-generated if empty">
                    </label>

                    <div class="arbe-hlc-inline-note">Request context stays separate from validated reference identity.</div>
                </div>

                <div class="arbe-hlc-grid">
                    <label>
                        <span>Input type</span>
                        <select data-arbe-input-type>
                            <option value="hex">HEX</option>
                            <option value="rgb">RGB</option>
                            <option value="lab">Lab</option>
                            <option value="hlc">HLC / FP</option>
                        </select>
                    </label>

                    <label class="arbe-hlc-grow">
                        <span>Request value</span>
                        <input type="text" data-arbe-input-value placeholder="#EEBE53">
                    </label>

                    <button type="button" class="arbe-hlc-btn" data-arbe-submit>Match reference</button>
                </div>

                <div class="arbe-hlc-presets">
                    <button type="button" class="arbe-hlc-chip" data-preset-type="hex" data-preset-value="#EEBE53">HEX sample</button>
                    <button type="button" class="arbe-hlc-chip" data-preset-type="rgb" data-preset-value="238,190,83">RGB sample</button>
                    <button type="button" class="arbe-hlc-chip" data-preset-type="lab" data-preset-value="80,10.4189,59.0885">Lab sample</button>
                    <button type="button" class="arbe-hlc-chip" data-preset-type="hlc" data-preset-value="H080_L080_C060">HLC sample</button>
                </div>

                <div class="arbe-hlc-status-row">
                    <div class="arbe-hlc-pill" data-arbe-health>Status: checking…</div>
                    <div class="arbe-hlc-note">No live conversion output. No generated colors. Result exists only after validated atlas snap.</div>
                </div>

                <div class="arbe-hlc-message" data-arbe-message hidden></div>

                <div class="arbe-hlc-result" data-arbe-result hidden>
                    <div class="arbe-hlc-section">
                        <div class="arbe-hlc-section-title">Request context</div>
                        <div class="arbe-hlc-meta-grid">
                            <div><span>Customer ref</span><strong data-arbe-result-customer-ref></strong></div>
                            <div><span>Request ID</span><strong data-arbe-result-request-id></strong></div>
                            <div><span>Requested at</span><strong data-arbe-result-requested-at></strong></div>
                        </div>
                    </div>

                    <div class="arbe-hlc-section">
                        <div class="arbe-hlc-section-title">Input request</div>
                        <div class="arbe-hlc-meta-grid">
                            <div><span>Input type</span><strong data-arbe-result-input-type></strong></div>
                            <div class="arbe-hlc-span-2"><span>Input value</span><strong data-arbe-result-input-value></strong></div>
                        </div>
                    </div>

                    <div class="arbe-hlc-section">
                        <div class="arbe-hlc-result-top">
                            <div>
                                <div class="arbe-hlc-result-label">Validated reference</div>
                                <div class="arbe-hlc-reference" data-arbe-reference></div>
                            </div>
                            <div class="arbe-hlc-swatch" data-arbe-swatch></div>
                        </div>

                        <div class="arbe-hlc-meta-grid">
                            <div><span>Match status</span><strong data-arbe-match-status></strong></div>
                            <div><span>Master version</span><strong data-arbe-master-version></strong></div>
                            <div><span>ΔE00</span><strong data-arbe-deltae></strong></div>
                            <div><span>HEX</span><strong data-arbe-hex></strong></div>
                            <div><span>RGB</span><strong data-arbe-rgb></strong></div>
                            <div><span>Lab</span><strong data-arbe-lab></strong></div>
                        </div>
                    </div>

                    <div class="arbe-hlc-section">
                        <div class="arbe-hlc-section-title">Structural attributes</div>
                        <div class="arbe-hlc-meta-grid">
                            <div><span>λ*_V2</span><strong data-arbe-lv2></strong></div>
                            <div><span>λ*_EE</span><strong data-arbe-lee></strong></div>
                            <div><span>Δλ*</span><strong data-arbe-dlambda></strong></div>
                            <div><span>μ₂</span><strong data-arbe-mu2></strong></div>
                            <div><span>σ*</span><strong data-arbe-sigma></strong></div>
                            <div><span>μ₃</span><strong data-arbe-mu3></strong></div>
                        </div>
                    </div>

                    <div class="arbe-hlc-section">
                        <div class="arbe-hlc-section-title">Technical validation</div>
                        <div class="arbe-hlc-meta-grid">
                            <div><span>Input interpretation</span><strong data-arbe-validation-input></strong></div>
                            <div><span>λ*_V2 method</span><strong data-arbe-validation-lv2-method></strong></div>
                            <div class="arbe-hlc-span-3"><span>Validation note</span><strong data-arbe-validation-note></strong></div>
                        </div>
                    </div>

                    <div class="arbe-hlc-fp-wrap">
                        <div class="arbe-hlc-result-label">FP code</div>
                        <textarea readonly data-arbe-fp></textarea>
                        <button type="button" class="arbe-hlc-copy" data-arbe-copy>Copy FP code</button>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return (string) ob_get_clean();
    }
}
