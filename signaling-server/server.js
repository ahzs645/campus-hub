const { createServer } = require("http");
const { Server } = require("socket.io");
const { HABridge } = require("./ha-bridge");

const PORT = process.env.PORT || 3030;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const httpServer = createServer((req, res) => {
  // Health check & connections API
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", displays: displays.size, controllers: controllers.size }));
  }

  if (req.method === "GET" && req.url === "/displays") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": CORS_ORIGIN,
    });
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
    return res.end(JSON.stringify(list));
  }

  // HA entity discovery — GET /ha/entities?domain=sensor
  if (req.method === "GET" && req.url?.startsWith("/ha/entities")) {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": CORS_ORIGIN,
    });
    const params = new URL(req.url, `http://localhost:${PORT}`).searchParams;
    const domain = params.get("domain") || undefined;
    return res.end(JSON.stringify(haBridge ? haBridge.getEntities(domain) : []));
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
    if (Array.isArray(entityIds)) {
      haBridge.subscribe(socket.id, entityIds);
    }
  });

  socket.on("ha-unsubscribe", ({ entityIds } = {}) => {
    haBridge.unsubscribe(socket.id, entityIds || null);
  });

  socket.on("ha-call-service", ({ domain, service, data, target } = {}) => {
    if (domain && service) {
      haBridge.callService(socket.id, domain, service, data, target);
    }
  });

  socket.on("ha-get-entities", ({ domain } = {}) => {
    const entities = haBridge.getEntities(domain);
    socket.emit("ha-entities", { entities });
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
