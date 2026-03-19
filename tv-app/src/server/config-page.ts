/**
 * HTML page served by the TV's embedded HTTP server.
 * Users scan the QR code, open this page on their phone,
 * and configure what the TV displays.
 */
export function getConfigPageHTML(
  currentConfig: { url?: string; configJson?: string },
  deviceName: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Campus Hub TV - Setup</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0a0a0a;
    color: #e5e7eb;
    min-height: 100vh;
    padding: 20px;
  }
  .container { max-width: 480px; margin: 0 auto; }
  .header {
    text-align: center;
    padding: 24px 0 20px;
    border-bottom: 1px solid #1f2937;
    margin-bottom: 24px;
  }
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    color: #f9fafb;
    margin-bottom: 4px;
  }
  .header .device {
    font-size: 13px;
    color: #6b7280;
  }
  .connected {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #064e3b;
    color: #34d399;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 12px;
  }
  .connected::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #34d399;
    border-radius: 50%;
  }
  .section {
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .section h2 {
    font-size: 15px;
    font-weight: 600;
    color: #d1d5db;
    margin-bottom: 12px;
  }
  .section p {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 12px;
    line-height: 1.5;
  }
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #9ca3af;
    margin-bottom: 6px;
  }
  input, textarea {
    width: 100%;
    padding: 10px 12px;
    background: #0a0a0a;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #f3f4f6;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  input:focus, textarea:focus {
    border-color: #3b82f6;
  }
  textarea {
    min-height: 140px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    resize: vertical;
  }
  .input-group { margin-bottom: 14px; }
  .btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  .btn-primary:hover { background: #2563eb; }
  .btn-primary:active { transform: scale(0.98); }
  .btn-secondary {
    background: #1f2937;
    color: #d1d5db;
    margin-top: 8px;
  }
  .btn-secondary:hover { background: #374151; }
  .or-divider {
    text-align: center;
    color: #4b5563;
    font-size: 12px;
    padding: 16px 0;
    position: relative;
  }
  .or-divider::before, .or-divider::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 40%;
    height: 1px;
    background: #1f2937;
  }
  .or-divider::before { left: 0; }
  .or-divider::after { right: 0; }
  .status {
    text-align: center;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 12px;
    display: none;
  }
  .status.success { display: block; background: #064e3b; color: #34d399; }
  .status.error { display: block; background: #450a0a; color: #f87171; }
  .status.loading { display: block; background: #1e1b4b; color: #818cf8; }
  .current {
    background: #0a0a0a;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    color: #6b7280;
    word-break: break-all;
    margin-top: 8px;
  }
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: #0a0a0a;
    border-radius: 8px;
    padding: 3px;
  }
  .tab {
    flex: 1;
    padding: 8px;
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    color: #6b7280;
    border: none;
    background: none;
    transition: all 0.15s;
  }
  .tab.active {
    background: #1f2937;
    color: #f3f4f6;
  }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }
  .action-btn {
    padding: 10px 8px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    color: #d1d5db;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: all 0.15s;
  }
  .action-btn:hover { background: #374151; }
  .action-btn:active { transform: scale(0.97); }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="connected">Connected to TV</div>
    <h1>Campus Hub TV</h1>
    <div class="device">${deviceName}</div>
  </div>

  <div class="section">
    <h2>Configure Display</h2>
    <div class="tabs">
      <button class="tab active" onclick="switchTab('url')">Live URL</button>
      <button class="tab" onclick="switchTab('json')">JSON Config</button>
    </div>

    <div id="tab-url" class="tab-content active">
      <p>Point the TV to any Campus Hub display URL or config URL.</p>
      <div class="input-group">
        <label>Display URL or Config URL</label>
        <input type="url" id="configUrl" placeholder="https://campus.ahmadjalil.com/display/?config=..."
          value="${currentConfig.url || ""}">
      </div>
      <button class="btn btn-primary" onclick="applyUrl()">Apply to TV</button>
    </div>

    <div id="tab-json" class="tab-content">
      <p>Paste a full display configuration JSON. This will be sent directly to the TV.</p>
      <div class="input-group">
        <label>Display Config JSON</label>
        <textarea id="configJson" placeholder='${`{"layout":[{"id":"1","type":"clock","x":0,"y":0,"w":4,"h":4}],"theme":{"primary":"#3b82f6"}}`}'>${currentConfig.configJson || ""}</textarea>
      </div>
      <button class="btn btn-primary" onclick="applyJson()">Apply Config to TV</button>
    </div>

    <div id="status" class="status"></div>
  </div>

  <div class="section">
    <h2>Quick Actions</h2>
    <div class="quick-actions">
      <button class="action-btn" onclick="sendAction('reload')">↻ Reload</button>
      <button class="action-btn" onclick="sendAction('reset')">⟲ Reset Default</button>
      <button class="action-btn" onclick="sendAction('identify')">◉ Identify TV</button>
      <button class="action-btn" onclick="sendAction('info')">ℹ Device Info</button>
    </div>
  </div>

  ${
    currentConfig.url
      ? `<div class="section">
    <h2>Currently Displaying</h2>
    <div class="current">${currentConfig.url}</div>
  </div>`
      : ""
  }
</div>

<script>
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
  if (type === 'success') setTimeout(() => { el.className = 'status'; }, 3000);
}

async function applyUrl() {
  const url = document.getElementById('configUrl').value.trim();
  if (!url) { showStatus('Please enter a URL', 'error'); return; }
  showStatus('Applying...', 'loading');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'url', value: url })
    });
    if (res.ok) showStatus('Applied! TV is updating...', 'success');
    else showStatus('Failed to apply', 'error');
  } catch(e) { showStatus('Connection lost to TV', 'error'); }
}

async function applyJson() {
  const json = document.getElementById('configJson').value.trim();
  if (!json) { showStatus('Please enter JSON config', 'error'); return; }
  try { JSON.parse(json); } catch(e) { showStatus('Invalid JSON: ' + e.message, 'error'); return; }
  showStatus('Applying...', 'loading');
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'json', value: json })
    });
    if (res.ok) showStatus('Applied! TV is updating...', 'success');
    else showStatus('Failed to apply', 'error');
  } catch(e) { showStatus('Connection lost to TV', 'error'); }
}

async function sendAction(action) {
  try {
    const res = await fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (action === 'info') {
      showStatus(JSON.stringify(data, null, 2), 'success');
    } else {
      showStatus(data.message || 'Done!', 'success');
    }
  } catch(e) { showStatus('Connection lost to TV', 'error'); }
}
</script>
</body>
</html>`;
}
