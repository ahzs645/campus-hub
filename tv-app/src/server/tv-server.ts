import { startServer } from "./http-server";
import { getConfigPageHTML } from "./config-page";

export type TVConfig = {
  url: string;
  configJson?: string;
};

export type TVAction = "reload" | "reset" | "identify";

type ConfigCallback = (config: TVConfig) => void;
type ActionCallback = (action: TVAction) => void;

const SERVER_PORT = 8888;

export function startTVServer(
  currentConfig: TVConfig,
  deviceName: string,
  onConfigChange: ConfigCallback,
  onAction: ActionCallback
) {
  let config = { ...currentConfig };

  const serverInstance = startServer(SERVER_PORT, (method, path, body) => {
    // CORS preflight
    if (method === "OPTIONS") {
      return { status: 204, contentType: "text/plain", body: "" };
    }

    // Serve config page
    if (path === "/" || path === "/index.html") {
      return {
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: getConfigPageHTML(
          { url: config.url, configJson: config.configJson },
          deviceName
        ),
      };
    }

    // API: update config
    if (path === "/api/config" && method === "POST") {
      try {
        const data = JSON.parse(body);

        if (data.type === "url") {
          config = { url: data.value };
          onConfigChange(config);
          return {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, message: "URL applied" }),
          };
        }

        if (data.type === "json") {
          // Validate JSON config
          const parsed = JSON.parse(data.value);
          config = {
            url: config.url,
            configJson: data.value,
          };
          onConfigChange(config);
          return {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, message: "Config applied" }),
          };
        }

        return {
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unknown config type" }),
        };
      } catch (e: any) {
        return {
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: e.message }),
        };
      }
    }

    // API: actions (reload, reset, identify, info)
    if (path === "/api/action" && method === "POST") {
      try {
        const data = JSON.parse(body);

        if (data.action === "info") {
          return {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              device: deviceName,
              currentUrl: config.url,
              port: SERVER_PORT,
            }),
          };
        }

        onAction(data.action);
        return {
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            message:
              data.action === "identify"
                ? "Check your TV screen!"
                : `Action '${data.action}' executed`,
          }),
        };
      } catch (e: any) {
        return {
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: e.message }),
        };
      }
    }

    // API: get current config
    if (path === "/api/config" && method === "GET") {
      return {
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(config),
      };
    }

    return {
      status: 404,
      contentType: "text/plain",
      body: "Not found",
    };
  });

  return {
    port: SERVER_PORT,
    stop: serverInstance.stop,
  };
}
