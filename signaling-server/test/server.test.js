// Integration tests for the signaling server: start it as a child process on a
// free port and talk to it over HTTP and Socket.IO.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");
const { io } = require("socket.io-client");

const TOKEN = "test-signaling-token";
let serverProcess;
let baseUrl;
const sockets = [];

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function startServer(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
      env: { PATH: process.env.PATH, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    const timer = setTimeout(() => reject(new Error(`server did not start:\n${output}`)), 10000);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes("running on port")) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited with ${code}:\n${output}`));
    });
  });
}

function connect(token = TOKEN) {
  const socket = io(baseUrl, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });
  sockets.push(socket);
  return socket;
}

function once(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

before(async () => {
  const port = await getFreePort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = await startServer({ PORT: String(port), SIGNALING_AUTH_TOKEN: TOKEN });
});

after(() => {
  for (const socket of sockets) socket.disconnect();
  serverProcess?.kill();
});

test("refuses to start without SIGNALING_AUTH_TOKEN", async () => {
  const port = await getFreePort();
  await assert.rejects(startServer({ PORT: String(port) }), /exited with 1/);
});

test("GET /health is open", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("HTTP endpoints return 401 without a valid bearer token", async () => {
  for (const headers of [{}, { Authorization: "Bearer wrong-token" }]) {
    const res = await fetch(`${baseUrl}/displays`, { headers });
    assert.equal(res.status, 401);
  }
});

test("POST /push-config to an unknown display returns 404", async () => {
  const res = await fetch(`${baseUrl}/push-config`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ displayId: "nobody-here", config: { type: "url", value: "https://example.edu" } }),
  });
  assert.equal(res.status, 404);
});

test("Socket.IO handshake is rejected without a valid token", async () => {
  const socket = connect("wrong-token");
  const err = await once(socket, "connect_error");
  assert.match(err.message, /Unauthorized/);
});

test("a display registers and receives config and actions from a controller and over HTTP", async () => {
  const display = connect();
  await once(display, "connect");
  display.emit("register-display", { displayId: "lobby-1", name: "Lobby" });
  assert.deepEqual(await once(display, "registered"), { displayId: "lobby-1", name: "Lobby" });

  const listRes = await fetch(`${baseUrl}/displays`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(listRes.status, 200);
  assert.deepEqual((await listRes.json()).map((d) => d.displayId), ["lobby-1"]);

  const controller = connect();
  await once(controller, "connect");
  const online = once(controller, "display-online");
  controller.emit("join-display", { displayId: "lobby-1" });
  assert.equal((await online).name, "Lobby");

  const config = { type: "url", value: "https://example.edu/display" };
  const applied = once(display, "apply-config");
  controller.emit("push-config", { displayId: "lobby-1", config });
  assert.deepEqual((await applied).config, config);

  const action = once(display, "apply-action");
  controller.emit("push-action", { displayId: "lobby-1", action: "identify" });
  assert.equal((await action).action, "identify");

  // The display's acknowledgement reaches the controller.
  const status = once(controller, "display-status");
  display.emit("display-status", { displayId: "lobby-1", status: { action: "identify", ok: true } });
  assert.deepEqual((await status).status, { action: "identify", ok: true });

  const httpApplied = once(display, "apply-config");
  const pushRes = await fetch(`${baseUrl}/push-config`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ displayId: "lobby-1", config }),
  });
  assert.equal(pushRes.status, 200);
  assert.equal((await httpApplied).from, "cloud");

  const offline = once(controller, "display-offline");
  display.disconnect();
  assert.equal((await offline).displayId, "lobby-1");
});

test("a controller joining an unregistered display is told it is offline", async () => {
  const controller = connect();
  await once(controller, "connect");
  const offline = once(controller, "display-offline");
  controller.emit("join-display", { displayId: "not-registered" });
  assert.equal((await offline).displayId, "not-registered");
});
