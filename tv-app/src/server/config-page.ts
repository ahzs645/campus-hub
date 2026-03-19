/**
 * HTML page served by the TV's embedded HTTP server.
 * Styled to match the Campus Hub dashboard theme.
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
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    background: #0a0f0d;
    color: #e5e7eb;
    min-height: 100vh;
    padding: 20px;
    position: relative;
    overflow-x: hidden;
  }
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    opacity: 0.3;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(183, 149, 39, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(3, 86, 66, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse at 50% 50%, rgba(183, 149, 39, 0.08) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
  .container { max-width: 480px; margin: 0 auto; position: relative; z-index: 1; }
  .header {
    text-align: center;
    padding: 24px 0 20px;
    border-bottom: 1px solid rgba(183, 149, 39, 0.15);
    margin-bottom: 24px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #f9fafb;
    margin-bottom: 4px;
    letter-spacing: -0.02em;
  }
  .header .device {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
  }
  .connected {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(3, 86, 66, 0.3);
    color: #34d399;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 20px;
    margin-bottom: 12px;
    border: 1px solid rgba(52, 211, 153, 0.2);
  }
  .connected::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #34d399;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .section {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(183, 149, 39, 0.12);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 16px;
    backdrop-filter: blur(10px);
  }
  .section h2 {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255,255,255,0.7);
    margin-bottom: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .section p {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 12px;
    line-height: 1.5;
  }
  label {
    display: block;
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.5);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  input, textarea {
    width: 100%;
    padding: 11px 14px;
    background: rgba(0,0,0,0.3);
    border: 1px solid rgba(183, 149, 39, 0.15);
    border-radius: 10px;
    color: #f3f4f6;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus {
    border-color: rgba(183, 149, 39, 0.5);
    box-shadow: 0 0 0 3px rgba(183, 149, 39, 0.1);
  }
  input::placeholder, textarea::placeholder {
    color: rgba(255,255,255,0.2);
  }
  textarea {
    min-height: 130px;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    font-size: 12px;
    resize: vertical;
  }
  .input-group { margin-bottom: 14px; }
  .btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .btn-primary {
    background: #B79527;
    color: #035642;
  }
  .btn-primary:hover { background: #c9a52e; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(183, 149, 39, 0.3); }
  .btn-primary:active { transform: translateY(0); }
  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: rgba(0,0,0,0.3);
    border-radius: 10px;
    padding: 3px;
    border: 1px solid rgba(255,255,255,0.05);
  }
  .tab {
    flex: 1;
    padding: 9px;
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    color: rgba(255,255,255,0.4);
    border: none;
    background: none;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .tab:hover { color: rgba(255,255,255,0.6); }
  .tab.active {
    background: rgba(183, 149, 39, 0.15);
    color: #B79527;
    font-weight: 600;
  }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .action-btn {
    padding: 11px 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(183, 149, 39, 0.12);
    border-radius: 10px;
    color: rgba(255,255,255,0.6);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .action-btn:hover { background: rgba(183, 149, 39, 0.1); border-color: rgba(183, 149, 39, 0.25); color: #B79527; }
  .action-btn:active { transform: scale(0.97); }
  .status {
    text-align: center;
    padding: 12px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    margin-top: 12px;
    display: none;
  }
  .status.success { display: block; background: rgba(3, 86, 66, 0.25); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); }
  .status.error { display: block; background: rgba(127, 29, 29, 0.25); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); }
  .status.loading { display: block; background: rgba(183, 149, 39, 0.1); color: #B79527; border: 1px solid rgba(183, 149, 39, 0.2); }
  .current {
    background: rgba(0,0,0,0.3);
    border-radius: 10px;
    padding: 12px 14px;
    font-size: 12px;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
    color: rgba(255,255,255,0.4);
    word-break: break-all;
    border: 1px solid rgba(255,255,255,0.05);
  }
  .logo-dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 12px;
  }
  .logo-dots span:nth-child(1) {
    width: 10px; height: 10px; border-radius: 50%; background: #B79527; animation: pulse 2s infinite;
  }
  .logo-dots span:nth-child(2) {
    width: 6px; height: 6px; border-radius: 50%; background: #B79527; opacity: 0.5;
  }
  .logo-dots span:nth-child(3) {
    width: 4px; height: 4px; border-radius: 50%; background: #B79527; opacity: 0.25;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo-dots"><span></span><span></span><span></span></div>
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
