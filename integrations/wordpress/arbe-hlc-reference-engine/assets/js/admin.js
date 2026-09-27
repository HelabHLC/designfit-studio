(function ($) {
  const runBtn = $('#arbe-run-installer');
  const resetBtn = $('#arbe-reset-installer');
  if (!runBtn.length || typeof ARBE_HLC_ADMIN === 'undefined') return;

  const stateEl = $('#arbe-install-state');
  const rowsEl = $('#arbe-imported-rows');
  const totalEl = $('#arbe-total-rows');
  const offsetEl = $('#arbe-current-offset');
  const textEl = $('#arbe-progress-text');
  const barEl = $('#arbe-progress-bar');

  let currentOffset = parseInt(ARBE_HLC_ADMIN.currentOffset || 0, 10);
  const chunkSize = parseInt(ARBE_HLC_ADMIN.chunkSize || 100, 10);

  function updateUi(state, rows, total, offset, message) {
    stateEl.text(state);
    rowsEl.text(rows);
    totalEl.text(total);
    if (offsetEl.length && typeof offset !== 'undefined') {
      offsetEl.text(offset);
    }
    const pct = total > 0 ? Math.round((rows / total) * 100) : 0;
    barEl.css('width', pct + '%');
    textEl.text(message ? (rows + ' of ' + total + ' rows imported — ' + message) : (rows + ' of ' + total + ' rows imported'));
    currentOffset = typeof offset !== 'undefined' ? offset : rows;
  }

  function showError(message) {
    textEl.text(message || 'Import failed.');
    runBtn.prop('disabled', false).text(currentOffset > 0 ? 'Resume installation' : 'Run guided installation');
  }

  function extractJson(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (e) {}
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch (e) {}
    }
    return null;
  }

  function post(action, data) {
    return $.ajax({
      url: ARBE_HLC_ADMIN.ajaxUrl,
      method: 'POST',
      dataType: 'text',
      data: Object.assign({}, data, {
        action: action,
        nonce: ARBE_HLC_ADMIN.nonce
      })
    });
  }

  function importChunk(offset) {
    runBtn.prop('disabled', true).text(offset > 0 ? 'Resuming…' : 'Installing…');
    post('arbe_hlc_install_chunk', { offset: offset, limit: chunkSize }).done(function (raw) {
      const response = extractJson(raw);
      if (!response) {
        showError('Import response was not valid JSON. First response bytes: ' + String(raw).slice(0, 240));
        return;
      }

      if (!response.success) {
        const msg = response && response.data && response.data.message ? response.data.message : 'AJAX import did not return success.';
        const debug = response && response.data && response.data.debug_output ? ' Debug: ' + response.data.debug_output : '';
        showError(msg + debug);
        return;
      }

      const data = response.data;
      updateUi(data.state, data.rows, data.total, data.offset, data.message);

      if (data.done) {
        runBtn.prop('disabled', false).text('Installation completed');
      } else {
        window.setTimeout(function () {
          importChunk(data.offset);
        }, 160);
      }
    }).fail(function (xhr, textStatus) {
      let message = 'Import request failed.';
      const raw = xhr && xhr.responseText ? xhr.responseText : '';
      const response = extractJson(raw);

      if (response && response.data && response.data.message) {
        message = response.data.message;
        if (response.data.debug_output) {
          message += ' Debug: ' + response.data.debug_output;
        }
      } else if (raw) {
        message = 'Import request failed (' + (xhr && xhr.status ? xhr.status : 'n/a') + ', ' + textStatus + '). First response bytes: ' + String(raw).slice(0, 240);
      } else if (xhr && xhr.status) {
        message = 'Import request failed with HTTP ' + xhr.status + '.';
      }
      showError(message);
    });
  }

  runBtn.on('click', function () {
    importChunk(currentOffset || 0);
  });

  resetBtn.on('click', function () {
    if (!window.confirm('Reset the imported master and start over?')) return;
    resetBtn.prop('disabled', true);
    post('arbe_hlc_install_reset', {}).done(function (raw) {
      const response = extractJson(raw);
      if (response && response.success) {
        updateUi(response.data.state, response.data.rows, response.data.total, 0, 'Installer reset.');
        runBtn.prop('disabled', false).text('Run guided installation');
      } else {
        showError('Reset response was not valid JSON.');
      }
    }).always(function () {
      resetBtn.prop('disabled', false);
    });
  });
})(jQuery);
