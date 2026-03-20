/**
 * Campus Hub Signaling Client
 *
 * Lightweight client for connecting displays and controllers
 * to the signaling server via Socket.IO.
 *
 * Usage (display):
 *   const client = createSignalingClient("ws://server:3030", "display", "lobby-tv-1");
 *   client.on("apply-config", ({ config }) => { ... });
 *   client.on("apply-action", ({ action }) => { ... });
 *   client.connect();
 *
 * Usage (controller):
 *   const client = createSignalingClient("ws://server:3030", "controller", "lobby-tv-1");
 *   client.on("display-online", (info) => { ... });
 *   client.pushConfig({ type: "url", value: "https://..." });
 *   client.connect();
 */

type Role = "display" | "controller";

interface SignalingConfig {
  type: "url" | "json" | "configUrl" | "playlistUrl";
  value: string;
}

type EventCallback = (data: Record<string, unknown>) => void;

interface SignalingClient {
  connect: () => void;
  disconnect: () => void;
  on: (event: string, callback: EventCallback) => void;
  off: (event: string, callback: EventCallback) => void;
  pushConfig: (config: SignalingConfig) => void;
  pushAction: (action: string) => void;
  sendHeartbeat: (currentConfig?: string) => void;
  reportStatus: (status: Record<string, unknown>) => void;
  isConnected: () => boolean;
}

function createSignalingClient(
  serverUrl: string,
  role: Role,
  displayId: string,
  options: { name?: string; currentConfig?: string; autoReconnect?: boolean } = {}
): SignalingClient {
  const { name, currentConfig, autoReconnect = true } = options;

  const listeners = new Map<string, Set<EventCallback>>();
  let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
  let connected = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  function emit(event: string, data: Record<string, unknown>) {
    const cbs = listeners.get(event);
    if (cbs) cbs.forEach((cb) => cb(data));
  }

  function on(event: string, callback: EventCallback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
  }

  function off(event: string, callback: EventCallback) {
    listeners.get(event)?.delete(callback);
  }

  async function connect() {
    // Dynamic import — socket.io-client is only loaded when signaling is used
    const { io } = await import("socket.io-client");

    socket = io(serverUrl, {
      reconnection: autoReconnect,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      connected = true;
      emit("connected", {});

      if (role === "display") {
        socket!.emit("register-display", { displayId, name, currentConfig });
        // Start heartbeat every 30s
        heartbeatInterval = setInterval(() => {
          socket!.emit("display-heartbeat", { displayId });
        }, 30000);
      } else {
        socket!.emit("join-display", { displayId });
      }
    });

    socket.on("disconnect", () => {
      connected = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      emit("disconnected", {});
    });

    // Forward server events to listeners
    const forwardEvents = [
      "registered",
      "apply-config",
      "apply-action",
      "message",
      "display-online",
      "display-offline",
      "display-status",
      "error",
    ];

    for (const event of forwardEvents) {
      socket.on(event, (data: Record<string, unknown>) => emit(event, data));
    }
  }

  function disconnect() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    socket?.disconnect();
    socket = null;
    connected = false;
  }

  function pushConfig(config: SignalingConfig) {
    socket?.emit("push-config", { displayId, config });
  }

  function pushAction(action: string) {
    socket?.emit("push-action", { displayId, action });
  }

  function sendHeartbeat(config?: string) {
    socket?.emit("display-heartbeat", { displayId, currentConfig: config });
  }

  function reportStatus(status: Record<string, unknown>) {
    socket?.emit("display-status", { displayId, status });
  }

  return {
    connect,
    disconnect,
    on,
    off,
    pushConfig,
    pushAction,
    sendHeartbeat,
    reportStatus,
    isConnected: () => connected,
  };
}

export { createSignalingClient };
export type { SignalingClient, SignalingConfig, Role };
