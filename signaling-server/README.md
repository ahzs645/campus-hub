# Campus Hub Signaling Server

This service stays separate from the browser engine and handles display control,
controller sessions, and optional Home Assistant access for the open-source
Campus Hub app.

## Modes

### Raw Home Assistant websocket bridge

Use this when you want live `ha-subscribe` updates and Home Assistant service
calls over Socket.IO.

```sh
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your-long-lived-access-token
PORT=3030
CORS_ORIGIN=http://localhost:3000
npm start
```

### `campus-hub-ha` plugin proxy

Use this when Home Assistant is running the `campus_hub_bridge` integration and
you want Campus Hub to fetch allowed entity data without exposing the plugin
token to the browser.

```sh
CAMPUS_HUB_HA_BASE_URL=http://homeassistant.local:8123
CAMPUS_HUB_HA_TOKEN=your-campus-hub-bridge-token
PORT=3030
CORS_ORIGIN=http://localhost:3000
npm start
```

That enables:

- `GET /ha/health`
- `GET /ha/entities`
- `GET /ha/state`

In the Home Assistant widget, choose `HTTP proxy` mode and point `HTTP Proxy URL`
at `http://localhost:3030/ha/state`.

## Notes

- Keep the signaling server separate from the shared engine packages.
- If both raw HA and `campus-hub-ha` are configured, live Socket.IO updates use
  the raw HA websocket bridge and HTTP routes use `campus-hub-ha`.
- `campus-hub-ha` is read-only. Service calls still require the raw Home
  Assistant websocket bridge.
