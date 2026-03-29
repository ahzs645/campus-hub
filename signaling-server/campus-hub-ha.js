const DEFAULT_TIMEOUT_MS = 10000;

class CampusHubHAProxy {
  constructor() {
    this.baseUrl = (process.env.CAMPUS_HUB_HA_BASE_URL || "").replace(/\/+$/, "");
    this.token = process.env.CAMPUS_HUB_HA_TOKEN || "";
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.token);
  }

  async request(pathname, requestUrl = "/") {
    if (!this.isConfigured()) {
      return null;
    }

    const upstreamUrl = new URL(pathname, `${this.baseUrl}/`);
    const incomingUrl = new URL(requestUrl, "http://localhost");
    incomingUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.append(key, value);
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(upstreamUrl, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        signal: controller.signal,
      });

      const text = await response.text();
      let payload = {};

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { error: text };
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || `Campus Hub HA returned ${response.status}`);
      }

      return payload;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { CampusHubHAProxy };
