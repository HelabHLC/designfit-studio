(function () {
  const root = document.querySelector('[data-arbe-hlc-tool]');
  if (!root || typeof ARBE_HLC_CONFIG === 'undefined') return;

  const els = {
    customerRef: root.querySelector('[data-arbe-customer-ref]'),
    requestId: root.querySelector('[data-arbe-request-id]'),
    type: root.querySelector('[data-arbe-input-type]'),
    value: root.querySelector('[data-arbe-input-value]'),
    submit: root.querySelector('[data-arbe-submit]'),
    health: root.querySelector('[data-arbe-health]'),
    message: root.querySelector('[data-arbe-message]'),
    result: root.querySelector('[data-arbe-result]'),
    resultCustomerRef: root.querySelector('[data-arbe-result-customer-ref]'),
    resultRequestId: root.querySelector('[data-arbe-result-request-id]'),
    resultRequestedAt: root.querySelector('[data-arbe-result-requested-at]'),
    resultInputType: root.querySelector('[data-arbe-result-input-type]'),
    resultInputValue: root.querySelector('[data-arbe-result-input-value]'),
    ref: root.querySelector('[data-arbe-reference]'),
    swatch: root.querySelector('[data-arbe-swatch]'),
    matchStatus: root.querySelector('[data-arbe-match-status]'),
    masterVersion: root.querySelector('[data-arbe-master-version]'),
    hex: root.querySelector('[data-arbe-hex]'),
    rgb: root.querySelector('[data-arbe-rgb]'),
    lab: root.querySelector('[data-arbe-lab]'),
    deltae: root.querySelector('[data-arbe-deltae]'),
    lv2: root.querySelector('[data-arbe-lv2]'),
    lee: root.querySelector('[data-arbe-lee]'),
    dlambda: root.querySelector('[data-arbe-dlambda]'),
    mu2: root.querySelector('[data-arbe-mu2]'),
    sigma: root.querySelector('[data-arbe-sigma]'),
    mu3: root.querySelector('[data-arbe-mu3]'),
    validationInput: root.querySelector('[data-arbe-validation-input]'),
    validationLv2Method: root.querySelector('[data-arbe-validation-lv2-method]'),
    validationNote: root.querySelector('[data-arbe-validation-note]'),
    fp: root.querySelector('[data-arbe-fp]'),
    copy: root.querySelector('[data-arbe-copy]')
  };

  const placeholders = {
    hex: '#EEBE53',
    rgb: '238,190,83',
    lab: '80,10.4189,59.0885',
    hlc: 'H080_L080_C060'
  };

  function setMessage(text, kind = 'info') {
    els.message.hidden = !text;
    els.message.textContent = text || '';
    els.message.className = 'arbe-hlc-message ' + kind;
  }

  function formatMaybe(value) {
    return value === null || typeof value === 'undefined' || value === '' ? '—' : String(value);
  }

  function generateRequestId() {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `REQ-${stamp}-${suffix}`;
  }

  function ensureRequestId() {
    if (!els.requestId.value.trim()) {
      els.requestId.value = generateRequestId();
    }
  }

  function setSubmitting(isSubmitting) {
    els.submit.disabled = isSubmitting;
    els.submit.textContent = isSubmitting ? 'Matching…' : 'Match reference';
  }

  function renderResult(payload) {
    const a = payload.attributes || {};
    const lab = a.lab || {};
    const rgb = Array.isArray(a.rgb) ? a.rgb.join(', ') : '—';
    const context = payload.request_context || {};
    const request = payload.input_request || {};
    const validation = payload.technical_validation || {};

    els.resultCustomerRef.textContent = formatMaybe(context.customer_ref);
    els.resultRequestId.textContent = formatMaybe(context.request_id);
    els.resultRequestedAt.textContent = formatMaybe(context.requested_at);
    els.resultInputType.textContent = formatMaybe(request.input_type);
    els.resultInputValue.textContent = formatMaybe(request.input_value);

    els.ref.textContent = payload.reference_id || '—';
    els.matchStatus.textContent = payload.match_status || '—';
    els.masterVersion.textContent = payload.source_master_version || '—';
    els.hex.textContent = a.hex || '—';
    els.rgb.textContent = rgb;
    els.lab.textContent = [lab.L, lab.a, lab.b].every(v => typeof v !== 'undefined')
      ? `${lab.L}, ${lab.a}, ${lab.b}`
      : '—';
    els.deltae.textContent = typeof payload.delta_e00 === 'number' ? payload.delta_e00.toFixed(4) : '—';
    els.lv2.textContent = formatMaybe(a.lambda_v2_nm);
    els.lee.textContent = formatMaybe(a.lambda_ee_nm);
    els.dlambda.textContent = formatMaybe(a.delta_lambda_nm);
    els.mu2.textContent = formatMaybe(a.mu2_nm2);
    els.sigma.textContent = formatMaybe(a.sigma_star_nm);
    els.mu3.textContent = formatMaybe(a.mu3_nm3);
    els.validationInput.textContent = formatMaybe(validation.input_interpretation);
    els.validationLv2Method.textContent = formatMaybe(validation.lambda_v2_method);
    els.validationNote.textContent = [validation.matching_method, validation.result_policy, validation.identity_policy]
      .filter(Boolean).join(' ') || '—';
    els.fp.textContent = payload.fp_code || '—';
    els.result.hidden = false;

    if (a.hex) {
      els.swatch.style.background = a.hex;
    } else {
      els.swatch.style.background = '#dfe7f7';
    }
  }

  async function parseJsonResponse(response) {
    const raw = await response.text();

    try {
      return JSON.parse(raw);
    } catch (err) {
      const trimmed = raw.trim();
      const firstObject = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstObject !== -1 && lastBrace !== -1 && lastBrace > firstObject) {
        const candidate = trimmed.slice(firstObject, lastBrace + 1);
        try {
          return JSON.parse(candidate);
        } catch (extractedErr) {
          throw new Error('JSON response was contaminated by extra script or markup before the payload.');
        }
      }

      throw new Error('JSON response was contaminated by extra script or markup before the payload.');
    }
  }

  async function requestViaRest(path, body) {
    const options = {
      credentials: 'same-origin',
      headers: {}
    };

    if (body) {
      options.method = 'POST';
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(path, options);
    const data = await parseJsonResponse(response);
    return { response, data, transport: 'REST' };
  }

  async function requestViaAjax(action, body) {
    const fd = new FormData();
    fd.append('action', action);
    fd.append('nonce', ARBE_HLC_CONFIG.ajaxNonce);

    Object.entries(body || {}).forEach(([key, value]) => {
      if (value === null || typeof value === 'undefined') return;
      fd.append(key, value);
    });

    const response = await fetch(ARBE_HLC_CONFIG.ajaxUrl, {
      method: 'POST',
      credentials: 'same-origin',
      body: fd
    });
    const data = await parseJsonResponse(response);
    return { response, data, transport: 'AJAX' };
  }

  async function loadHealth() {
    try {
      let packet;
      try {
        packet = await requestViaRest(ARBE_HLC_CONFIG.healthUrl);
      } catch (restErr) {
        packet = await requestViaAjax('arbe_hlc_frontend_health', {});
      }

      const data = packet.data;
      if (data.plugin_ready) {
        els.health.textContent = `Status: ready · ${data.imported_rows} rows · ${packet.transport}`;
      } else {
        els.health.textContent = `Status: ${data.install_state || 'pending'} · installer required · ${packet.transport}`;
      }
    } catch (err) {
      els.health.textContent = 'Status: unavailable';
    }
  }

  async function submit() {
    setMessage('');
    els.result.hidden = true;
    setSubmitting(true);
    ensureRequestId();

    const payload = {
      customer_ref: els.customerRef.value.trim(),
      request_id: els.requestId.value.trim(),
      requested_at: new Date().toISOString(),
      input_type: els.type.value,
      value: els.value.value,
      master_version: 'active'
    };

    try {
      let packet;
      try {
        packet = await requestViaRest(ARBE_HLC_CONFIG.matchUrl, payload);
      } catch (restErr) {
        packet = await requestViaAjax('arbe_hlc_frontend_match', payload);
      }

      const res = packet.response;
      const data = packet.data;

      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'No validated result returned.');
      }

      renderResult(data);
      if (packet.transport === 'AJAX') {
        setMessage('Validated reference returned via fallback transport.', 'success');
      } else {
        setMessage('Validated reference returned.', 'success');
      }
    } catch (err) {
      setMessage(err.message || 'No validated result returned.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  els.type.addEventListener('change', () => {
    els.value.placeholder = placeholders[els.type.value] || '';
  });

  els.requestId.addEventListener('blur', ensureRequestId);

  root.querySelectorAll('[data-preset-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      els.type.value = btn.dataset.presetType || 'hex';
      els.value.value = btn.dataset.presetValue || '';
      els.value.placeholder = placeholders[els.type.value] || '';
    });
  });

  els.submit.addEventListener('click', submit);

  if (els.copy) {
    els.copy.addEventListener('click', async () => {
      const text = els.fp.textContent || '';
      if (!text || text === '—') return;

      try {
        await navigator.clipboard.writeText(text);
        els.copy.textContent = 'Copied';
        setTimeout(() => {
          els.copy.textContent = 'Copy FP code';
        }, 1200);
      } catch (err) {
        els.copy.textContent = 'Copy failed';
        setTimeout(() => {
          els.copy.textContent = 'Copy FP code';
        }, 1200);
      }
    });
  }

  loadHealth();
})();
