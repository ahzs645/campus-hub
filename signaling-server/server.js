const { createServer } = require("http");
const { Server } = require("socket.io");
const { HABridge } = require("./ha-bridge");
const { CampusHubHAProxy } = require("./campus-hub-ha");

const PORT = process.env.PORT || 3030;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const campusHubHA = new CampusHubHAProxy();

function jsonResponse(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function corsHeaders(extraHeaders = {}) {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    ...extraHeaders,
  };
}

function parseRequestUrl(requestUrl = "/") {
  return new URL(requestUrl, `http://localhost:${PORT}`);
}

function getRequestedEntityIds(requestUrl = "/") {
  const params = parseRequestUrl(requestUrl).searchParams;
  const requestedIds = new Set();

  for (const entityId of params.getAll("entity_id")) {
    const trimmed = entityId.trim();
    if (trimmed) requestedIds.add(trimmed);
  }

  const csvIds = params.get("entity_ids");
  if (csvIds) {
    for (const entityId of csvIds.split(",")) {
      const trimmed = entityId.trim();
      if (trimmed) requestedIds.add(trimmed);
    }
  }

  return [...requestedIds];
}

function filterEntitiesByDomain(entities, domain) {
  if (!domain) return entities;
  return entities.filter((entity) => entity.entity_id?.startsWith(`${domain}.`));
}

async function getHAEntities(requestUrl = "/") {
  const domain = parseRequestUrl(requestUrl).searchParams.get("domain") || undefined;

  if (campusHubHA.isConfigured()) {
    const payload = await campusHubHA.request("/api/campus_hub_bridge/entities", requestUrl);
    return filterEntitiesByDomain(payload.entities || [], domain);
  }

  return haBridge ? haBridge.getEntities(domain) : [];
}

async function getHAStatePayload(requestUrl = "/") {
  if (campusHubHA.isConfigured()) {
    return {
      ...(await campusHubHA.request("/api/campus_hub_bridge/state", requestUrl)),
      source: "campus-hub-ha",
    };
  }

  const requestedEntityIds = getRequestedEntityIds(requestUrl);
  const states = haBridge ? haBridge.getStates(requestedEntityIds) : [];

  return {
    source: "raw-ha-websocket",
    requested_entity_ids: requestedEntityIds,
    states,
    count: states.length,
  };
}

async function getHAHealthPayload() {
  if (campusHubHA.isConfigured()) {
    return {
      ...(await campusHubHA.request("/api/campus_hub_bridge/health")),
      source: "campus-hub-ha",
    };
  }

  const entityCount = haBridge ? haBridge.getEntities().length : 0;
  return {
    ok: haBridge ? haBridge.connected : false,
    entity_count: entityCount,
    source: "raw-ha-websocket",
  };
}

const httpServer = createServer((req, res) => {
  // Health check & connections API
  if (req.method === "GET" && req.url === "/health") {
    return jsonResponse(res, 200, {
      status: "ok",
      displays: displays.size,
      controllers: controllers.size,
      homeAssistantMode: campusHubHA.isConfigured() ? "campus-hub-ha" : "raw-ha-websocket",
    });
  }

  if (req.method === "GET" && req.url === "/displays") {
    const list = [];
    for (const [id, display] of displays) {
      list.push({
        displayId: id,
        name: display.name,
        connectedAt: display.connectedAt,
        lastHeartbeat: display.lastHeartbeat,
        currentConfig: display.currentConfig,
        controllerCount: display.controllers.size,
      });
    }
    return jsonResponse(res, 200, list, corsHeaders());
  }

  if (req.method === "GET" && req.url?.startsWith("/ha/health")) {
    void (async () => {
      try {
        jsonResponse(res, 200, await getHAHealthPayload(), corsHeaders());
      } catch (err) {
        jsonResponse(res, 502, { error: err.message }, corsHeaders());
      }
    })();
    return;
  }

  // HA entity discovery — GET /ha/entities?domain=sensor
  if (req.method === "GET" && req.url?.startsWith("/ha/entities")) {
    void (async () => {
      try {
        jsonResponse(res, 200, await getHAEntities(req.url), corsHeaders());
      } catch (err) {
        jsonResponse(res, 502, { error: err.message }, corsHeaders());
      }
    })();
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/ha/state")) {
    void (async () => {
      try {
        jsonResponse(res, 200, await getHAStatePayload(req.url), corsHeaders());
      } catch (err) {
        jsonResponse(res, 502, { error: err.message }, corsHeaders());
      }
    })();
    return;
  }

  // Server-side config push — used by campus-hub-cloud's Convex actions
  if (req.method === "POST" && req.url === "/push-config") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { displayId, config } = JSON.parse(body);
        const display = displays.get(displayId);
        if (display) {
          console.log(`[push-config] HTTP POST -> "${displayId}"`);
          display.socket.emit("apply-config", { config, from: "cloud" });
          jsonResponse(res, 200, { ok: true }, corsHeaders());
        } else {
          jsonResponse(res, 404, { error: "Display not connected" }, corsHeaders());
        }
      } catch (err) {
        jsonResponse(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  // CORS preflight for POST endpoints
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// Home Assistant bridge
const haBridge = new HABridge(io);

// State
// displays: Map<displayId, { socketId, socket, name, connectedAt, lastHeartbeat, currentConfig, controllers: Set<socketId> }>
const displays = new Map();
// controllers: Map<socketId, { socket, targetDisplayId }>
const controllers = new Map();
// socketToDisplay: Map<socketId, displayId> — reverse lookup for display sockets
const socketToDisplay = new Map();

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // === DISPLAY ROLE ===
  socket.on("register-display", ({ displayId, name, currentConfig } = {}) => {
    if (!displayId) return socket.emit("error", { message: "displayId required" });

    // If display ID already taken by another socket, reject
    const existing = displays.get(displayId);
    if (existing && existing.socketId !== socket.id) {
      // Boot old connection (reconnect scenario)
      existing.socket.disconnect(true);
    }

    const display = {
      socketId: socket.id,
      socket,
      name: name || displayId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      currentConfig: currentConfig || null,
      controllers: existing?.controllers || new Set(),
    };

    displays.set(displayId, display);
    socketToDisplay.set(socket.id, displayId);
    socket.join(`display:${displayId}`);

    console.log(`[display] "${displayId}" registered`);
    socket.emit("registered", { displayId, name: display.name });

    // Notify any controllers watching this display
    io.to(`controllers:${displayId}`).emit("display-online", {
      displayId,
      name: display.name,
      currentConfig: display.currentConfig,
    });
  });

  socket.on("display-heartbeat", ({ displayId, currentConfig } = {}) => {
    const display = displays.get(displayId);
    if (display && display.socketId === socket.id) {
      display.lastHeartbeat = Date.now();
      if (currentConfig !== undefined) display.currentConfig = currentConfig;
    }
  });

  socket.on("display-status", ({ displayId, status } = {}) => {
    // Display reports status back (e.g., config applied, error, etc.)
    io.to(`controllers:${displayId}`).emit("display-status", {
      displayId,
      status,
    });
  });

  // === CONTROLLER ROLE ===
  socket.on("join-display", ({ displayId } = {}) => {
    if (!displayId) return socket.emit("error", { message: "displayId required" });

    socket.join(`controllers:${displayId}`);
    controllers.set(socket.id, { socket, targetDisplayId: displayId });

    const display = displays.get(displayId);
    if (display) {
      display.controllers.add(socket.id);
      socket.emit("display-online", {
        displayId,
        name: display.name,
        currentConfig: display.currentConfig,
      });
    } else {
      socket.emit("display-offline", { displayId });
    }

    console.log(`[controller] ${socket.id} joined display "${displayId}"`);
  });

  socket.on("leave-display", ({ displayId } = {}) => {
    socket.leave(`controllers:${displayId}`);
    controllers.delete(socket.id);
    const display = displays.get(displayId);
    if (display) display.controllers.delete(socket.id);
  });

  // Controller sends command to display
  socket.on("push-config", ({ displayId, config } = {}) => {
    const display = displays.get(displayId);
    if (!display) return socket.emit("error", { message: "Display not connected" });

    console.log(`[push-config] -> "${displayId}"`);
    display.socket.emit("apply-config", { config, from: socket.id });
  });

  socket.on("push-action", ({ displayId, action } = {}) => {
    const display = displays.get(displayId);
    if (!display) return socket.emit("error", { message: "Display not connected" });

    console.log(`[push-action] "${action}" -> "${displayId}"`);
    display.socket.emit("apply-action", { action, from: socket.id });
  });

  // === HOME ASSISTANT BRIDGE ===
  socket.on("ha-subscribe", ({ entityIds } = {}) => {
    if (!Array.isArray(entityIds) || entityIds.length === 0) return;

    if (haBridge.isConfigured()) {
      haBridge.subscribe(socket.id, entityIds);
      return;
    }

    if (campusHubHA.isConfigured()) {
      socket.emit("ha-error", {
        message: "Live Home Assistant subscriptions require HA_URL and HA_TOKEN on the signaling server. Use HTTP mode with /ha/state when sourcing data from campus-hub-ha.",
      });
    }
  });

  socket.on("ha-unsubscribe", ({ entityIds } = {}) => {
    haBridge.unsubscribe(socket.id, entityIds || null);
  });

  socket.on("ha-call-service", ({ domain, service, data, target } = {}) => {
    if (haBridge.isConfigured() && domain && service) {
      haBridge.callService(socket.id, domain, service, data, target);
      return;
    }

    if (campusHubHA.isConfigured()) {
      socket.emit("ha-error", {
        message: "campus-hub-ha is read-only. Service calls must go through the raw Home Assistant websocket bridge.",
      });
    }
  });

  socket.on("ha-get-entities", async ({ domain } = {}) => {
    try {
      const query = domain ? `/ha/entities?domain=${encodeURIComponent(domain)}` : "/ha/entities";
      const entities = await getHAEntities(query);
      socket.emit("ha-entities", { entities });
    } catch (err) {
      socket.emit("ha-error", { message: err.message });
    }
  });

  // === GENERIC MESSAGE (for future extensibility) ===
  socket.on("message", ({ displayId, payload } = {}) => {
    const display = displays.get(displayId);
    if (display) {
      display.socket.emit("message", { from: socket.id, payload });
    }
  });

  // === DISCONNECT ===
  socket.on("disconnect", () => {
    // Was this a display?
    const displayId = socketToDisplay.get(socket.id);
    if (displayId) {
      console.log(`[display] "${displayId}" disconnected`);
      io.to(`controllers:${displayId}`).emit("display-offline", { displayId });
      displays.delete(displayId);
      socketToDisplay.delete(socket.id);
    }

    // Was this a controller?
    const controller = controllers.get(socket.id);
    if (controller) {
      const display = displays.get(controller.targetDisplayId);
      if (display) display.controllers.delete(socket.id);
      controllers.delete(socket.id);
    }

    // Clean up HA subscriptions
    haBridge.removeDisplay(socket.id);

    console.log(`[disconnect] ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Campus Hub Signaling Server running on port ${PORT}`);
});
