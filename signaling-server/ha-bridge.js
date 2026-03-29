/**
 * Home Assistant Bridge
 *
 * Connects to a Home Assistant instance via its WebSocket API,
 * subscribes to entity state changes, and forwards them to
 * connected displays via the signaling server.
 *
 * Displays request which entities they care about via
 * "ha-subscribe" events. The bridge tracks subscriptions per
 * display and only forwards relevant state changes.
 *
 * Environment variables:
 *   HA_URL       — Home Assistant URL (e.g. http://homeassistant.local:8123)
 *   HA_TOKEN     — Long-lived access token from HA
 */

const WebSocket = require("ws");

class HABridge {
  constructor(io) {
    this.io = io;
    this.haUrl = process.env.HA_URL || "";
    this.haToken = process.env.HA_TOKEN || "";
    this.ws = null;
    this.msgId = 1;
    this.connected = false;
    this.entityStates = new Map(); // entity_id -> state object
    this.pendingRequests = new Map(); // msgId -> callback
    // displaySocketId -> Set<entity_id>
    this.displaySubscriptions = new Map();
    // entity_id -> Set<displaySocketId>
    this.entitySubscribers = new Map();
    this.reconnectTimer = null;

    if (this.haUrl && this.haToken) {
      this.connect();
    } else {
      console.log("[ha-bridge] HA_URL or HA_TOKEN not set, bridge disabled");
    }
  }

  isConfigured() {
    return Boolean(this.haUrl && this.haToken);
  }

  connect() {
    const wsUrl = this.haUrl.replace(/^http/, "ws") + "/api/websocket";
    console.log(`[ha-bridge] Connecting to ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on("open", () => {
      console.log("[ha-bridge] WebSocket connected");
    });

    this.ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      this.handleMessage(msg);
    });

    this.ws.on("close", () => {
      console.log("[ha-bridge] WebSocket closed, reconnecting in 5s...");
      this.connected = false;
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", (err) => {
      console.error("[ha-bridge] WebSocket error:", err.message);
    });
  }

  handleMessage(msg) {
    // Auth flow
    if (msg.type === "auth_required") {
      this.ws.send(
        JSON.stringify({ type: "auth", access_token: this.haToken })
      );
      return;
    }

    if (msg.type === "auth_ok") {
      console.log("[ha-bridge] Authenticated with HA");
      this.connected = true;
      // Subscribe to all state changes
      this.sendHA("subscribe_events", { event_type: "state_changed" });
      // Fetch all current states
      this.sendHA("get_states", {}, (result) => {
        if (Array.isArray(result)) {
          for (const entity of result) {
            this.entityStates.set(entity.entity_id, entity);
          }
          console.log(
            `[ha-bridge] Loaded ${this.entityStates.size} entity states`
          );
          // Push current states to any already-subscribed displays
          this.pushCurrentStatesToAll();
        }
      });
      return;
    }

    if (msg.type === "auth_invalid") {
      console.error("[ha-bridge] Auth failed:", msg.message);
      return;
    }

    // Handle responses to our requests
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const cb = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);
      if (msg.success !== false && cb) cb(msg.result);
      return;
    }

    // State change events
    if (msg.type === "event" && msg.event?.event_type === "state_changed") {
      const { entity_id, new_state } = msg.event.data;
      if (!new_state) return;

      this.entityStates.set(entity_id, new_state);

      // Forward to subscribed displays
      const subscribers = this.entitySubscribers.get(entity_id);
      if (subscribers) {
        const statePayload = this.formatEntityState(new_state);
        for (const socketId of subscribers) {
          this.io.to(socketId).emit("ha-state", statePayload);
        }
      }
    }
  }

  sendHA(type, data = {}, callback = null) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return null;
    const id = this.msgId++;
    if (callback) this.pendingRequests.set(id, callback);
    this.ws.send(JSON.stringify({ id, type, ...data }));
    return id;
  }

  formatEntityState(entity) {
    return {
      entity_id: entity.entity_id,
      state: entity.state,
      attributes: entity.attributes || {},
      last_changed: entity.last_changed,
      last_updated: entity.last_updated,
    };
  }

  // Called when a display subscribes to entities
  subscribe(socketId, entityIds) {
    if (!Array.isArray(entityIds) || entityIds.length === 0) return;

    // Track display -> entities
    if (!this.displaySubscriptions.has(socketId)) {
      this.displaySubscriptions.set(socketId, new Set());
    }
    const displaySubs = this.displaySubscriptions.get(socketId);

    for (const entityId of entityIds) {
      displaySubs.add(entityId);

      // Track entity -> displays
      if (!this.entitySubscribers.has(entityId)) {
        this.entitySubscribers.set(entityId, new Set());
      }
      this.entitySubscribers.get(entityId).add(socketId);

      // Send current state immediately if we have it
      const current = this.entityStates.get(entityId);
      if (current) {
        this.io.to(socketId).emit("ha-state", this.formatEntityState(current));
      }
    }

    console.log(
      `[ha-bridge] ${socketId} subscribed to ${entityIds.length} entities`
    );
  }

  // Called when a display unsubscribes
  unsubscribe(socketId, entityIds) {
    const displaySubs = this.displaySubscriptions.get(socketId);
    if (!displaySubs) return;

    const toRemove = entityIds || [...displaySubs]; // null = unsubscribe all
    for (const entityId of toRemove) {
      displaySubs.delete(entityId);
      const subs = this.entitySubscribers.get(entityId);
      if (subs) {
        subs.delete(socketId);
        if (subs.size === 0) this.entitySubscribers.delete(entityId);
      }
    }

    if (displaySubs.size === 0) this.displaySubscriptions.delete(socketId);
  }

  // Called when a display disconnects
  removeDisplay(socketId) {
    this.unsubscribe(socketId, null);
  }

  // Called when a display wants to call an HA service
  callService(socketId, domain, service, data, target) {
    if (!this.connected) {
      this.io
        .to(socketId)
        .emit("ha-error", { message: "Not connected to Home Assistant" });
      return;
    }

    this.sendHA(
      "call_service",
      {
        domain,
        service,
        service_data: data || {},
        target: target || {},
      },
      (result) => {
        this.io.to(socketId).emit("ha-service-result", {
          domain,
          service,
          success: true,
          result,
        });
      }
    );

    console.log(`[ha-bridge] Service call: ${domain}.${service} from ${socketId}`);
  }

  // Fetch specific entity states on demand (e.g. camera proxy image)
  fetchEntityState(socketId, entityId) {
    const current = this.entityStates.get(entityId);
    if (current) {
      this.io.to(socketId).emit("ha-state", this.formatEntityState(current));
    }
  }

  pushCurrentStatesToAll() {
    for (const [socketId, entityIds] of this.displaySubscriptions) {
      for (const entityId of entityIds) {
        const current = this.entityStates.get(entityId);
        if (current) {
          this.io
            .to(socketId)
            .emit("ha-state", this.formatEntityState(current));
        }
      }
    }
  }

  getStates(entityIds) {
    const requestedIds = Array.isArray(entityIds) && entityIds.length > 0
      ? entityIds
      : [...this.entityStates.keys()];
    const states = [];

    for (const entityId of requestedIds) {
      const entity = this.entityStates.get(entityId);
      if (entity) {
        states.push(this.formatEntityState(entity));
      }
    }

    return states;
  }

  // Expose entity list for discovery
  getEntities(filter) {
    const entities = [];
    for (const [id, entity] of this.entityStates) {
      if (filter && !id.startsWith(filter + ".")) continue;
      entities.push({
        entity_id: id,
        state: entity.state,
        friendly_name: entity.attributes?.friendly_name || id,
        domain: id.split(".")[0],
        icon: entity.attributes?.icon,
        unit: entity.attributes?.unit_of_measurement,
        device_class: entity.attributes?.device_class,
      });
    }
    return entities.sort((a, b) => a.entity_id.localeCompare(b.entity_id));
  }

  destroy() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
    this.displaySubscriptions.clear();
    this.entitySubscribers.clear();
  }
}

module.exports = { HABridge };
