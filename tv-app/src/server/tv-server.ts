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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function startTVServer(
  currentConfig: TVConfig,
  deviceName: string,
  onConfigChange: ConfigCallback,
  onAction: ActionCallback
) {
  const initialConfig = { ...currentConfig };
  let config = { ...initialConfig };

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
        const data = JSON.parse(body) as {
          type?: string;
          value?: string;
        };

        if (data.type === "url") {
          if (typeof data.value !== "string" || !data.value.trim()) {
            return {
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({ error: "A non-empty URL is required" }),
            };
          }

          config = { url: data.value.trim() };
          onConfigChange(config);
          return {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, message: "URL applied" }),
          };
        }

        if (data.type === "json") {
          if (typeof data.value !== "string" || !data.value.trim()) {
            return {
              status: 400,
              contentType: "application/json",
              body: JSON.stringify({ error: "A JSON config is required" }),
            };
          }

          // Validate JSON config
          JSON.parse(data.value);
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
      } catch (error) {
        return {
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: getErrorMessage(error) }),
        };
      }
    }

    // API: actions (reload, reset, identify, info)
    if (path === "/api/action" && method === "POST") {
      try {
        const data = JSON.parse(body) as {
          action?: string;
        };

        if (typeof data.action !== "string") {
          return {
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: "Action is required" }),
          };
        }

        if (data.action === "info") {
          return {
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              device: deviceName,
              currentUrl: config.url,
              hasConfigJson: Boolean(config.configJson),
              port: SERVER_PORT,
            }),
          };
        }

        if (
          data.action !== "reload" &&
          data.action !== "reset" &&
          data.action !== "identify"
        ) {
          return {
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({ error: `Unknown action '${data.action}'` }),
          };
        }

        if (data.action === "reset") {
          config = { ...initialConfig };
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
      } catch (error) {
        return {
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: getErrorMessage(error) }),
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
