---
title: System Overview
description: High-level architecture of Campus Hub.
draft: false
---

Campus Hub is a **fully static, client-side** digital signage platform. There is no backend server — the entire application compiles to HTML, CSS, and JavaScript files that run in the browser.

## High-level architecture

```
┌────────────────────────────────────────────────────────┐
│                    Static Host                          │
│              (Cloudflare Pages, etc.)                   │
│                                                        │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Landing   │  │ Configurator │  │  Display Page    │ │
│  │ /         │  │ /configure   │  │  /display?...    │ │
│  └──────────┘  └──────┬───────┘  └────────┬─────────┘ │
│                       │                    │           │
│                       │    URL with        │           │
│                       │    encoded config  │           │
│                       └────────────────────┘           │
└────────────────────────────────────────────────────────┘
                              │
                              │ Client-side fetch
                              ▼
                  ┌───────────────────────┐
                  │   CORS Proxy Worker   │
                  │   (Cloudflare/Vercel) │
                  └───────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Weather API     RSS Feeds      iCal Servers
        (Open-Meteo)   (news sites)   (Google Cal, etc.)
```

## Application pages

### Landing page (`/`)

A static marketing page that links to the configurator and a demo display. No runtime dependencies.

### Configurator (`/configure`)

The main editing interface where you:
- Add, remove, and position widgets on a grid
- Configure widget options (data sources, appearance)
- Set theme colors, school name, logo, and CORS proxy
- Generate shareable URLs
- Export/import JSON configurations

The configurator uses [GridStack.js](https://gridstackjs.com/) for drag-and-drop layout editing with snap-to-grid behavior.

State is persisted to `localStorage` so you don't lose work if you close the tab.

### Display page (`/display`)

The rendering surface for actual display screens. It reads the configuration from the URL and renders widgets in a CSS grid.

Key features:
- **Fixed-resolution rendering** — the layout is rendered at a 1080p reference resolution and CSS-scaled to fill the actual viewport. This ensures pixel-perfect consistency across different screen sizes.
- **Multiple config sources** — supports inline `config` parameter, external `configUrl`, `playlistUrl`, and `screen` map lookups.
- **Auto-rotation** — playlist mode cycles through multiple configurations with configurable durations.

## Data flow

```
┌──────────────────────────────────────────────┐
│                Configurator                   │
│                                              │
│  DisplayConfig {                             │
│    layout: WidgetConfig[]                    │
│    theme: { primary, accent, background }    │
│    schoolName: string                        │
│    corsProxy: string                         │
│    ...                                       │
│  }                                           │
│                                              │
│         │ encodeConfig()                     │
│         ▼                                    │
│  Shortest `json-url` share token            │
│         │                                    │
│         ▼                                    │
│  URL: /display?config=NobwRA...              │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│                Display Page                   │
│                                              │
│  decodeConfig(searchParams.config)           │
│         │                                    │
│         ▼                                    │
│  normalizeConfig() — validates & fills       │
│  defaults for missing/corrupted fields       │
│         │                                    │
│         ▼                                    │
│  CSS Grid renders WidgetConfig[] as          │
│  positioned <WidgetRenderer> components      │
│         │                                    │
│         ▼                                    │
│  Each WidgetRenderer looks up the component  │
│  from the widget registry and mounts it      │
└──────────────────────────────────────────────┘
```

## Build output

The Next.js build with `output: "export"` produces a static `out/` directory:

```
out/
  index.html            # Landing page
  configure/
    index.html          # Configurator SPA
  display/
    index.html          # Display SPA
  _next/
    static/             # JS, CSS bundles
```

No Node.js server is needed at runtime. The entire site is served as static files.

## Design decisions

### Why static export?

- **Zero infrastructure** — no servers to maintain, no databases to manage.
- **CDN-friendly** — deploy to any edge network for fast global access.
- **Reliability** — static files never crash. Displays can run indefinitely.

### Why URL-based config?

- **No authentication needed** — anyone with the link can view the display.
- **Version control** — URLs are snapshots. Different displays = different URLs.
- **Offline resilience** — once a display page loads, it doesn't need the server again (except for external data fetching).

### Why client-side data fetching?

- **Real-time data** — weather, events, and news update in the browser without redeploying.
- **No server costs** — the CORS proxy is the only infrastructure, and it's stateless.
- **Widget independence** — each widget manages its own data lifecycle.

### Why not a dedicated tvOS app?

Campus Hub is intentionally documented and supported as a **web-first signage platform**, not as a native Apple TV product.

The main reasons are practical:

- **The browser is already the product surface** — the configurator, URL-based sharing, and display runtime all assume a static web deployment that can open on any screen with a browser.
- **The widget catalog is currently web-native** — many display widgets rely on browser capabilities such as CSS Grid, iframe embeds, HTML media elements, SVG/CSS animation, and DOM measurement APIs. Rebuilding those as shared native components would either reduce widget capabilities or require parallel implementations.
- **A native tvOS app adds a second platform to maintain** — in addition to the web app, it introduces Xcode, CocoaPods, native signing, simulator/device testing, release packaging, and platform-specific debugging.
- **Parity would be expensive** — keeping web and tvOS rendering identical would force the widget system toward React Native constraints, which would slow down web feature development and make some existing widgets harder to support.
- **The web path is more portable** — a browser-based display can run on laptops, mini PCs, kiosks, smart displays, Android TV browsers, and other managed devices without creating and distributing separate native apps.

There may still be experimental native TV work in the repository, but it is not the primary deployment model. The recommended approach is:

1. Host Campus Hub as a static web app.
2. Open the generated `/display` URL on the target screen or device.
3. Treat native TV shells, if they exist, as optional experiments rather than the main supported architecture.

### Why Android TV / Google TV is still viable

Android TV and Google TV remain practical targets because they align more naturally with Campus Hub's web-first deployment model.

- **They work well with browser- or WebView-based delivery** — if the device or management stack can pin a browser, kiosk browser, or lightweight shell to a single URL, Campus Hub can usually run without redesigning the widget system around native UI constraints.
- **They are better suited to lightweight wrapper apps** — when a dedicated shell is needed, Android is generally a better fit for a minimal "open this display URL on boot" container than a full parallel native product strategy.
- **Device management is usually more flexible** — Android-based signage deployments commonly support kiosk launchers, single-app lock-down, remote provisioning, and MDM-style management flows that fit unattended display hardware.
- **Hardware choice is broader and cheaper** — there are more low-cost sticks, boxes, panels, and embedded devices in the Android TV / Google TV ecosystem, which makes fleet rollout easier for signage use cases.
- **Offline or bundled deployments are more achievable** — if a deployment needs a packaged local copy of the static site instead of a hosted URL, Android is a more natural place to support that without changing the overall architecture.

In other words: Campus Hub is not documented as a native TV app product, but Android TV / Google TV can still be a good deployment target when used as a managed runtime for the web display.

### Android TV pairing model

The supported Android TV shell uses a **direct local HTTP pairing flow** rather than a cloud relay or a WebRTC-style signaling system.

- The TV app shows a QR code that opens its own local setup page, for example `http://<tv-ip>:8888/?pair=<code>`.
- The phone connects directly to the TV on the same LAN.
- A short pairing code gates access to the local control APIs.
- The local page sends display URLs, JSON configs, and actions such as reload/reset/identify directly to the TV.

This model was chosen because it matches the product's current deployment assumptions:

- **Same-network installs are the common case** — signage administrators are usually configuring a screen while physically near it and on the same local network.
- **It avoids backend coupling** — no relay, device registry, TURN infrastructure, or account-bound pairing layer is required to ship the Android shell.
- **It keeps the TV app thin** — the app only needs a local setup endpoint and a WebView-based display runtime.

There are also explicit limits to this approach:

- **No LAN discovery from a normal hosted web page** — browsers do not expose LocalSend-style nearby-device discovery to ordinary sites.
- **No serverless WebRTC setup win** — using WebRTC would still introduce signaling complexity that is unnecessary for local signage control.
- **No reliance on experimental browser APIs** — emerging proposals such as the Local Peer-to-Peer API are promising, but not mature enough to be the foundation of the shipped pairing flow.

The Android shell reserves a future local WebSocket path for live sessions, but the shipped control plane is direct local HTTP because it is the most stable path today.
