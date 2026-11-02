# Campus Hub

A configurable digital signage platform for campus displays. Build custom dashboard layouts with drag-and-drop widgets — weather, events, transit, media, and more.

Built with Next.js 16, React 19, Tailwind CSS 4, and GridStack.

## Status

This repo is the **public static demo and companion tooling**: the configurator,
display renderer and widget gallery exported as a static site
(campus.ahmadjalil.com), the optional `signaling-server/`, and the TV shell in
`tv-app/`. The full multi-tenant product (accounts, workspaces, saved sources,
scheduling, managed displays) is
[campus-hub-cloud](https://github.com/ahzs645/campus-hub-cloud), which uses the
same engine, configurator, SDK and widget packages.

## Project Structure

The shared packages are git submodules under `packages/`:

```
campus-hub/                         ← This repo (Next.js app)
  packages/campus-hub-engine/       ← Widget engine & display renderer
  packages/campus-hub-configurator/ ← Drag-and-drop layout editor
  packages/campus-hub-widget-sdk/   ← Widget SDK (manifest, hooks, Vite discovery)
  packages/campus-hub-widgets/      ← Widget packages (npm workspace)
  signaling-server/                 ← Optional Socket.IO relay (see below)
  tv-app/                           ← Android TV shell (see tv-app/README.md)
  docs/                             ← Astro documentation site
```

### Routes

- `/` — Landing page
- `/configure` — Drag-and-drop dashboard configurator
- `/display` — Fullscreen display renderer (shareable via URL)
- `/gallery` — Browse all available widgets
- `/tv-setup` — TV/kiosk setup flow

## Getting Started

### Clone

Clone with the submodules:

```bash
git clone --recurse-submodules https://github.com/ahzs645/campus-hub.git
```

For an existing checkout, run `git submodule update --init` (and again after
pulling a commit that moves a submodule pointer).

### Install & Run

```bash
cd campus-hub
npm install
npm run dev
```

The dev server starts at [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build:app   # Build the Next.js app only
npm run build       # Build app + docs
```

## Signaling Server (optional)

`signaling-server/` is a small Socket.IO relay that lets `/tv-setup` push configs and
actions to browser-based displays (`/display?signal=...&displayId=...`) and optionally
bridges Home Assistant. It is **not** started by `npm run dev`; run it separately.

It refuses to start without a shared secret, and denies cross-origin browser access
and all Home Assistant service calls unless explicitly allowed:

```bash
cd signaling-server && npm install
SIGNALING_AUTH_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
CORS_ORIGIN=http://localhost:3000 \
HA_ALLOWED_SERVICES= \
npm start
```

| Variable | Purpose |
|----------|---------|
| `SIGNALING_AUTH_TOKEN` | Required. Sent by clients in the Socket.IO handshake (`auth.token`) and as `Authorization: Bearer` on HTTP endpoints (all except `GET /health`). |
| `CORS_ORIGIN` | Comma-separated dashboard origins allowed to connect from a browser. No default (denied when unset). |
| `HA_ALLOWED_SERVICES` | Comma-separated `domain.service` allowlist for Home Assistant service calls. Empty (default) denies all. |

Give the token to a display once via `&signalingToken=<token>` (remembered in
`localStorage`) and enter it in the **Signaling token** field on `/tv-setup`.
See [`signaling-server/README.md`](signaling-server/README.md) for the full reference.
Run its tests with `cd signaling-server && npm test`.

From `/tv-setup`, **Reload**, **Reset Default**, **Identify TV** and **Device Info**
work over signaling as well as direct pairing. The display acknowledges each
action, so the controller only reports success once the display has run it.
**Reset Default** drops the display's config parameters (`config`, `configJson`,
`configUrl`, `playlistUrl`, `screen`, `screenUrl`) and reloads with the default
config, keeping its signaling connection.

## Embedding a display (postMessage)

An embedding page can push a config into `/display` with
`postMessage({ type: 'campus-hub-config', config }, displayOrigin)`. The display
only accepts the message from the window that embeds it (`window.parent`) or
opened it (`window.opener`), and only from one of these origins:

- the display's own origin;
- origins listed in `NEXT_PUBLIC_DISPLAY_ALLOWED_ORIGINS` (comma-separated, set at
  build time);
- the origin given as `?parentOrigin=https://example.edu` on the display URL.

## Deployment

Deployed to GitHub Pages via the `.github/workflows/deploy.yml` workflow. The workflow checks out the repo with its submodules (`submodules: recursive`) and builds the static export.

Triggered on push to `main` or manually via workflow dispatch.
