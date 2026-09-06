/**
 * Campus Hub Signaling Client
 *
 * Lightweight client for connecting displays and controllers
 * to the signaling server via Socket.IO.
 *
 * The server requires a shared secret (SIGNALING_AUTH_TOKEN). Pass it as
 * `options.token`; it is sent in the Socket.IO handshake `auth` payload.
 *
 * Usage (display):
 *   const client = createSignalingClient("ws://server:3030", "display", "lobby-tv-1", { token });
 *   client.on("apply-config", ({ config }) => { ... });
 *   client.on("apply-action", ({ action }) => { ... });
 *   client.connect();
 *
 * Usage (controller):
 *   const client = createSignalingClient("ws://server:3030", "controller", "lobby-tv-1", { token });
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

interface SignalingClientOptions {
  name?: string;
  currentConfig?: string;
  autoReconnect?: boolean;
  /** Shared secret matching the server's SIGNALING_AUTH_TOKEN. */
  token?: string;
}

interface SignalingClient {
  connect: () => Promise<void>;
  disconnect: () => void;
  on: (event: string, callback: EventCallback) => void;
  off: (event: string, callback: EventCallback) => void;
  pushConfig: (config: SignalingConfig) => void;
  pushAction: (action: string) => void;
  sendHeartbeat: (currentConfig?: string) => void;
  reportStatus: (status: Record<string, unknown>) => void;
  isConnected: () => boolean;
  // Home Assistant bridge
  haSubscribe: (entityIds: string[]) => void;
  haUnsubscribe: (entityIds?: string[]) => void;
  haCallService: (domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>) => void;
  haGetEntities: (domain?: string) => void;
}

function createSignalingClient(
  serverUrl: string,
  role: Role,
  displayId: string,
  options: SignalingClientOptions = {}
): SignalingClient {
  const { name, currentConfig, autoReconnect = true, token } = options;

  const listeners = new Map<string, Set<EventCallback>>();
  let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
  let connected = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  // Incremented by every connect()/disconnect(). A socket created by a
  // connect() call whose generation is no longer current (because disconnect()
  // ran while the dynamic import was pending) is closed immediately instead of
  // leaking.
  let generation = 0;

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

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
    // Close any socket from a previous connect() before opening another.
    disconnect();
    const myGeneration = ++generation;

    // Dynamic import — socket.io-client is only loaded when signaling is used
    const { io } = await import("socket.io-client");

    // disconnect() (or another connect()) ran while the import was pending.
    if (myGeneration !== generation) return;

    const newSocket = io(serverUrl, {
      reconnection: autoReconnect,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
      auth: { token },
    });
    socket = newSocket;

    newSocket.on("connect", () => {
      if (myGeneration !== generation) {
        newSocket.disconnect();
        return;
      }
      connected = true;
      emit("connected", {});

      if (role === "display") {
        newSocket.emit("register-display", { displayId, name, currentConfig });
        // Start heartbeat every 30s
        stopHeartbeat();
        heartbeatInterval = setInterval(() => {
          newSocket.emit("display-heartbeat", { displayId });
        }, 30000);
      } else {
        newSocket.emit("join-display", { displayId });
      }
    });

    newSocket.on("connect_error", (err: Error) => {
      // Surfaced by the server's auth middleware when the token is missing/invalid.
      emit("error", { message: err.message });
    });

    newSocket.on("disconnect", () => {
      connected = false;
      stopHeartbeat();
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
      // Home Assistant bridge events
      "ha-state",
      "ha-entities",
      "ha-error",
      "ha-service-result",
    ];

    for (const event of forwardEvents) {
      newSocket.on(event, (data: Record<string, unknown>) => emit(event, data));
    }
  }

  function disconnect() {
    // Invalidate any connect() still awaiting its import.
    generation++;
    stopHeartbeat();
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

  // Home Assistant bridge methods
  function haSubscribe(entityIds: string[]) {
    socket?.emit("ha-subscribe", { entityIds });
  }

  function haUnsubscribe(entityIds?: string[]) {
    socket?.emit("ha-unsubscribe", { entityIds });
  }

  function haCallService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>) {
    socket?.emit("ha-call-service", { domain, service, data, target });
  }

  function haGetEntities(domain?: string) {
    socket?.emit("ha-get-entities", { domain });
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
    haSubscribe,
    haUnsubscribe,
    haCallService,
    haGetEntities,
  };
}

export { createSignalingClient };
export type { SignalingClient, SignalingClientOptions, SignalingConfig, Role };
