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
│  LZ-compressed string                       │
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
