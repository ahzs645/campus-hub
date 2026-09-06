# Campus Hub Signaling Server

This service stays separate from the browser engine and handles display control,
controller sessions, and optional Home Assistant access for the open-source
Campus Hub app.

## Security configuration (required)

The server is a relay that can navigate every connected display to an arbitrary
URL and (optionally) call Home Assistant services, so it must never run
unauthenticated.

| Variable | Required | Purpose |
|----------|----------|---------|
| `SIGNALING_AUTH_TOKEN` | **yes** | Shared secret. The server refuses to start without it. Every Socket.IO connection must send it as `auth.token` in the handshake (or as `?token=<token>` on the server URL, for clients that only take a URL); every HTTP endpoint except `GET /health` requires `Authorization: Bearer <token>`. |
| `CORS_ORIGIN` | for browser clients | Comma-separated list of dashboard origins allowed to connect cross-origin, e.g. `https://hub.example.edu,http://localhost:3000`. There is no default: when unset, cross-origin browser access is denied. |
| `HA_ALLOWED_SERVICES` | for HA service calls | Comma-separated `domain.service` allowlist for `ha-call-service`, e.g. `light.turn_on,light.turn_off,switch.toggle`. Default is empty, which denies **all** service calls. |

Generate a token:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Clients supply the token like this:

- Display page: open `/display?signal=ws://server:3030&displayId=lobby-1&signalingToken=<token>` once.
  The token is stored in `localStorage` (`campus-hub:signaling-token`) so later loads may omit it.
- TV setup page (`/tv-setup`): enter it in the **Signaling token** field next to the server URL,
  or open `/tv-setup?signalingToken=<token>` to prefill it.
- Campus Hub Cloud and widget-sdk signaling clients (Home Assistant widget in `signaling` mode, cloud
  `signaling` display mode): they only accept a server URL, so append the token to it:
  `ws://server:3030/?token=<token>`.
- HTTP callers (e.g. `POST /push-config` from campus-hub-cloud): send
  `Authorization: Bearer <token>`. The `POST /push-config` body is limited to 64 KB.

Displays only act on `http:`/`https:` URLs in pushed configs; anything else
(`javascript:`, `data:`, …) is logged and ignored.

## Modes

### Raw Home Assistant websocket bridge

Use this when you want live `ha-subscribe` updates and Home Assistant service
calls over Socket.IO.

```sh
SIGNALING_AUTH_TOKEN=your-shared-secret
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your-long-lived-access-token
HA_ALLOWED_SERVICES=light.turn_on,light.turn_off,switch.toggle
PORT=3030
CORS_ORIGIN=http://localhost:3000
npm start
```

Service calls not listed in `HA_ALLOWED_SERVICES` are answered with an
`ha-service-result` event where `success` is `false`.

### `campus-hub-ha` plugin proxy

Use this when Home Assistant is running the `campus_hub_bridge` integration and
you want Campus Hub to fetch allowed entity data without exposing the plugin
token to the browser.

```sh
SIGNALING_AUTH_TOKEN=your-shared-secret
CAMPUS_HUB_HA_BASE_URL=http://homeassistant.local:8123
CAMPUS_HUB_HA_TOKEN=your-campus-hub-bridge-token
PORT=3030
CORS_ORIGIN=http://localhost:3000
npm start
```

That enables (all behind `Authorization: Bearer <SIGNALING_AUTH_TOKEN>`):

- `GET /ha/health`
- `GET /ha/entities`
- `GET /ha/state`

In the Home Assistant widget, choose `HTTP proxy` mode and point `HTTP Proxy URL`
at `http://localhost:3030/ha/state`. The caller must send the bearer token.

## Notes

- Keep the signaling server separate from the shared engine packages.
- If both raw HA and `campus-hub-ha` are configured, live Socket.IO updates use
  the raw HA websocket bridge and HTTP routes use `campus-hub-ha`.
- `campus-hub-ha` is read-only. Service calls still require the raw Home
  Assistant websocket bridge.
