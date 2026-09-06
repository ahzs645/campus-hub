# Campus Hub

A configurable digital signage platform for campus displays. Build custom dashboard layouts with drag-and-drop widgets — weather, events, transit, media, and more.

Built with Next.js 16, React 19, Tailwind CSS 4, and GridStack.

## Project Structure

This is a multi-repo project with three packages:

```
campus-hub/              ← This repo (Next.js app)
campus-hub-engine/       ← Widget engine & renderer
campus-hub-configurator/ ← Drag-and-drop layout editor
```

### Routes

- `/` — Landing page
- `/configure` — Drag-and-drop dashboard configurator
- `/display` — Fullscreen display renderer (shareable via URL)
- `/gallery` — Browse all available widgets
- `/tv-setup` — TV/kiosk setup flow

## Getting Started

### Prerequisites

Clone all three repos as siblings:

```bash
git clone https://github.com/ahzs645/campus-hub.git
git clone https://github.com/ahzs645/campus-hub-engine.git
git clone https://github.com/ahzs645/campus-hub-configurator.git
```

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

## Deployment

Deployed to GitHub Pages via the `.github/workflows/deploy.yml` workflow. The workflow automatically checks out all three repos and builds the static export.

Triggered on push to `main` or manually via workflow dispatch.
