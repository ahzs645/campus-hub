package com.campushubtv

import fi.iki.elonen.NanoHTTPD
import fi.iki.elonen.NanoHTTPD.Response
import org.json.JSONException
import org.json.JSONObject

enum class TvAction {
  RELOAD,
  RESET,
  IDENTIFY,
}

class TvHttpServer(
    port: Int,
    private val listener: Listener,
) : NanoHTTPD(port) {

  interface Listener {
    fun onConfigUpdated(config: TvConfig)
    fun onAction(action: TvAction)
    fun getCurrentConfig(): TvConfig
    fun getDeviceName(): String
    fun getSetupSession(): SetupSession
  }

  override fun serve(session: IHTTPSession): Response {
    return when {
      session.method == Method.OPTIONS -> {
        newFixedLengthResponse(Response.Status.NO_CONTENT, MIME_PLAINTEXT, "").withCors()
      }
      session.uri == "/" || session.uri == "/index.html" -> {
        serveSetupPage(session)
      }
      session.uri == "/api/config" && session.method == Method.GET -> {
        requireAuthorization(session)?.let { return it }
        newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                buildConfigJson(listener.getCurrentConfig()))
            .withCors()
      }
      session.uri == "/api/info" && session.method == Method.GET -> {
        requireAuthorization(session)?.let { return it }
        newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                buildInfoJson(listener.getCurrentConfig()))
            .withCors()
      }
      session.uri == "/api/config" && session.method == Method.POST -> {
        handleConfigUpdate(session)
      }
      session.uri == "/api/action" && session.method == Method.POST -> {
        handleAction(session)
      }
      else -> newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not found").withCors()
    }
  }

  private fun handleConfigUpdate(session: IHTTPSession): Response {
    requireAuthorization(session)?.let { return it }

    return try {
      val payload = session.parseJsonBody()
      val type = payload.optString("type")
      val value = payload.optString("value").trim()

      if (value.isBlank()) {
        return jsonError(Response.Status.BAD_REQUEST, "A non-empty value is required")
      }

      val currentConfig = listener.getCurrentConfig()
      val nextConfig =
          when (type) {
            "url" -> TvConfig(url = value, configJson = null)
            "json" -> {
              JSONObject(value)
              TvConfig(url = currentConfig.url, configJson = value)
            }
            else -> return jsonError(Response.Status.BAD_REQUEST, "Unknown config type")
          }

      listener.onConfigUpdated(nextConfig)

      newFixedLengthResponse(
              Response.Status.OK,
              "application/json",
              JSONObject()
                  .put("ok", true)
                  .put("message", "Configuration applied")
                  .toString())
          .withCors()
    } catch (error: JSONException) {
      jsonError(Response.Status.BAD_REQUEST, error.message ?: "Invalid JSON")
    } catch (error: Exception) {
      jsonError(Response.Status.BAD_REQUEST, error.message ?: "Request failed")
    }
  }

  private fun handleAction(session: IHTTPSession): Response {
    requireAuthorization(session)?.let { return it }

    return try {
      val payload = session.parseJsonBody()
      val actionName = payload.optString("action")

      if (actionName == "info") {
        return newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                buildInfoJson(listener.getCurrentConfig()))
            .withCors()
      }

      val action =
          when (actionName) {
            "reload" -> TvAction.RELOAD
            "reset" -> TvAction.RESET
            "identify" -> TvAction.IDENTIFY
            else -> return jsonError(Response.Status.BAD_REQUEST, "Unknown action")
          }

      listener.onAction(action)

      newFixedLengthResponse(
              Response.Status.OK,
              "application/json",
              JSONObject()
                  .put("ok", true)
                  .put("message", "Action '$actionName' executed")
                  .toString())
          .withCors()
    } catch (error: Exception) {
      jsonError(Response.Status.BAD_REQUEST, error.message ?: "Request failed")
    }
  }

  private fun buildConfigJson(config: TvConfig): String =
      JSONObject()
          .put("url", config.url)
          .put("configJson", config.configJson)
          .toString()

  private fun buildInfoJson(config: TvConfig): String {
    val setupSession = listener.getSetupSession()
    return JSONObject()
        .put("apiVersion", 1)
        .put("device", listener.getDeviceName())
        .put("currentUrl", config.url)
        .put("hasConfigJson", !config.configJson.isNullOrBlank())
        .put("port", BuildConfig.SETUP_SERVER_PORT)
        .put(
            "pairing",
            JSONObject()
                .put("required", true)
                .put("mode", "code")
                .put("codeLength", setupSession.pairCode.length))
        .put(
            "transport",
            JSONObject()
                .put("http", true)
                .put("supportsWebSocket", setupSession.supportsWebSocket)
                .put("webSocketPath", setupSession.webSocketPath))
        .toString()
  }

  private fun serveSetupPage(session: IHTTPSession): Response {
    val requestedPairCode = session.parameters.firstValue("pair").orEmpty()
    return newFixedLengthResponse(
            Response.Status.OK,
            "text/html; charset=utf-8",
            buildSetupPage(listener.getDeviceName(), requestedPairCode))
        .withCors()
  }

  private fun buildSetupPage(deviceName: String, requestedPairCode: String): String {
    val escapedDevice = deviceName.htmlEscape()
    val defaultUrl = TvConfigStore.defaultConfig().url.htmlEscape()
    val escapedRequestedPairCode = requestedPairCode.htmlEscape()

    return """
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>$escapedDevice</title>
        <style>
          :root { color-scheme: dark; }
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at top left, rgba(183,149,39,0.18), transparent 35%),
              radial-gradient(circle at bottom right, rgba(3,86,66,0.32), transparent 40%),
              #09121b;
            color: #f5f7fa;
          }
          main {
            max-width: 760px;
            margin: 0 auto;
            padding: 32px 20px 56px;
          }
          .card {
            background: rgba(9, 18, 27, 0.78);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 18px;
            backdrop-filter: blur(18px);
          }
          h1, h2 { margin: 0 0 12px; }
          p { color: rgba(245,247,250,0.72); line-height: 1.5; }
          label { display: block; margin-bottom: 8px; font-weight: 600; }
          input, textarea {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.05);
            color: #fff;
            border-radius: 12px;
            padding: 14px;
            font: inherit;
          }
          textarea { min-height: 220px; resize: vertical; }
          .row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 14px;
          }
          button {
            border: 0;
            border-radius: 999px;
            padding: 12px 18px;
            font-weight: 700;
            cursor: pointer;
            background: #b79527;
            color: #081018;
          }
          button.secondary {
            background: rgba(255,255,255,0.08);
            color: #fff;
          }
          .status {
            min-height: 24px;
            margin-top: 12px;
            color: #9fe7c6;
            font-weight: 600;
          }
          .status.error { color: #ff9090; }
          .muted { color: rgba(245,247,250,0.5); font-size: 0.95rem; }
          code { color: #f6d67a; }
          .hidden { display: none; }
        </style>
      </head>
      <body>
        <main>
          <section class="card">
            <h1>$escapedDevice</h1>
            <p>Use this direct local page to configure the Android TV shell. This pairing flow stays on the same LAN and does not require a relay server.</p>
            <p class="muted">Default display URL: <code>$defaultUrl</code></p>
          </section>

          <section class="card" id="pairingCard">
            <h2>Pair with this TV</h2>
            <p>Scan the QR code from the TV screen or enter the 6-digit pairing code shown on the TV if you opened the base address manually.</p>
            <label for="pairCode">Pair code</label>
            <input id="pairCode" type="text" inputmode="numeric" maxlength="6" value="$escapedRequestedPairCode" placeholder="123456" />
            <div class="row">
              <button type="button" onclick="connectToTv()">Connect to TV</button>
            </div>
            <div id="status" class="status"></div>
          </section>

          <div id="controls" class="hidden">
          <section class="card">
            <h2>Live URL</h2>
            <label for="displayUrl">Campus Hub display URL</label>
            <input id="displayUrl" type="url" value="" placeholder="$defaultUrl" />
            <div class="row">
              <button type="button" onclick="applyConfig('url')">Apply URL</button>
            </div>
          </section>

          <section class="card">
            <h2>JSON Config</h2>
            <label for="configJson">Display config JSON</label>
            <textarea id="configJson" placeholder='{"widgets": []}'></textarea>
            <div class="row">
              <button type="button" onclick="applyConfig('json')">Apply JSON</button>
            </div>
          </section>

          <section class="card">
            <h2>Actions</h2>
            <div class="row">
              <button type="button" class="secondary" onclick="sendAction('reload')">Reload</button>
              <button type="button" class="secondary" onclick="sendAction('identify')">Identify</button>
              <button type="button" class="secondary" onclick="sendAction('reset')">Reset</button>
            </div>
            <p id="transportHint" class="muted"></p>
          </section>
          </div>
        </main>

        <script>
          const pairCodeInput = document.getElementById('pairCode');
          const displayUrlInput = document.getElementById('displayUrl');
          const configJsonInput = document.getElementById('configJson');
          const controlsNode = document.getElementById('controls');
          const statusNode = document.getElementById('status');
          const transportHintNode = document.getElementById('transportHint');

          pairCodeInput.addEventListener('input', () => {
            pairCodeInput.value = pairCodeInput.value.replace(/\\D/g, '').slice(0, 6);
          });

          pairCodeInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
              connectToTv();
            }
          });

          function setStatus(message, isError = false) {
            statusNode.textContent = message;
            statusNode.className = isError ? 'status error' : 'status';
          }

          async function apiRequest(path, init = {}) {
            const headers = new Headers(init.headers || {});
            const pairCode = pairCodeInput.value.trim();
            if (!pairCode) {
              throw new Error('Enter the pairing code shown on the TV.');
            }

            headers.set('X-Pair-Code', pairCode);

            if (init.body && !headers.has('Content-Type')) {
              headers.set('Content-Type', 'application/json');
            }

            const response = await fetch(path, { ...init, headers });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
              throw new Error(payload.error || 'Request failed');
            }

            return payload;
          }

          async function connectToTv() {
            try {
              const [config, info] = await Promise.all([
                apiRequest('/api/config'),
                apiRequest('/api/info'),
              ]);

              displayUrlInput.value = config.url || '';
              configJsonInput.value = config.configJson || '';
              controlsNode.classList.remove('hidden');

              const transport = info.transport || {};
              transportHintNode.textContent = transport.supportsWebSocket
                ? 'Live control is using a direct WebSocket session.'
                : 'Live control currently uses direct local HTTP. A future live socket path is reserved at ' + (transport.webSocketPath || '/ws') + '.';

              setStatus('Connected to ' + (info.device || '$escapedDevice') + '.');
            } catch (error) {
              controlsNode.classList.add('hidden');
              setStatus(error.message || 'Could not connect to TV.', true);
            }
          }

          async function applyConfig(type) {
            const value = (type === 'url' ? displayUrlInput : configJsonInput).value;
            try {
              const payload = await apiRequest('/api/config', {
                method: 'POST',
                body: JSON.stringify({ type, value }),
              });
              setStatus(payload.message || 'Applied');
            } catch (error) {
              setStatus(error.message || 'Request failed', true);
            }
          }

          async function sendAction(action) {
            try {
              const payload = await apiRequest('/api/action', {
                method: 'POST',
                body: JSON.stringify({ action }),
              });
              setStatus(payload.message || 'Done');
            } catch (error) {
              setStatus(error.message || 'Request failed', true);
            }
          }

          if (pairCodeInput.value.trim()) {
            connectToTv();
          }
        </script>
      </body>
      </html>
    """.trimIndent()
  }

  private fun requireAuthorization(session: IHTTPSession): Response? {
    return if (isAuthorized(session)) {
      null
    } else {
      jsonError(Response.Status.UNAUTHORIZED, "Enter the 6-digit pairing code shown on the TV.")
    }
  }

  private fun isAuthorized(session: IHTTPSession): Boolean {
    val expectedPairCode = listener.getSetupSession().pairCode
    val pairCode =
        session.headers["x-pair-code"]
            ?: session.headers["X-Pair-Code"]
            ?: session.parameters.firstValue("pair")

    return !pairCode.isNullOrBlank() && pairCode.trim() == expectedPairCode
  }

  private fun jsonError(status: Response.Status, message: String): Response =
      newFixedLengthResponse(
              status,
              "application/json",
              JSONObject().put("error", message).toString())
          .withCors()

  private fun IHTTPSession.parseJsonBody(): JSONObject {
    val files = mutableMapOf<String, String>()
    parseBody(files)
    val rawBody = files["postData"] ?: ""
    return JSONObject(rawBody)
  }
}

private fun Response.withCors(): Response {
  addHeader("Access-Control-Allow-Origin", "*")
  addHeader("Access-Control-Allow-Headers", "Content-Type, X-Pair-Code")
  addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  return this
}

private fun String.htmlEscape(): String =
    this.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")
        .replace("'", "&#39;")

private fun Map<String, List<String>>.firstValue(key: String): String? = this[key]?.firstOrNull()
