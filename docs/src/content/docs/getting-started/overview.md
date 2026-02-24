---
title: Overview
description: What Campus Hub is and how it works.
draft: false
---

Campus Hub is a **modular digital signage platform** built for campus and building displays. It lets you design widget-based layouts in a visual configurator and deploy them to any screen — all without a backend server.

## Key concepts

- **Widgets** — Self-contained UI components (clocks, event lists, weather, video players, etc.) that you drag onto a grid layout.
- **URL-based configuration** — The entire display state is encoded into the URL. Share a link and any browser opens the exact same display. No database required.
- **CORS proxy** — Widgets that pull external data (RSS feeds, iCal calendars, weather APIs) route requests through an optional CORS proxy you control.
- **Static export** — The app compiles to a static site (`next build` with `output: "export"`), so it can be hosted on any CDN, GitHub Pages, or Cloudflare Pages.

## How it works

```
 ┌──────────────┐        ┌──────────────────┐
 │ Configurator │──URL──▶│  Display Page     │
 │  /configure  │        │  /display?config= │
 └──────────────┘        └──────────────────┘
                                │
                   ┌────────────┼────────────┐
                   ▼            ▼            ▼
              WidgetA      WidgetB      WidgetC
              (clock)     (events)    (weather)
                               │            │
                               ▼            ▼
                          iCal feed    Weather API
                         (via CORS     (via CORS
                          proxy)        proxy)
```

1. You design a layout in the **Configurator** at `/configure`.
2. Click **Generate URL** — the full configuration is LZ-compressed and appended as a query parameter.
3. Open the URL on any display screen. The **Display** page at `/display` decodes the config and renders widgets in a CSS grid that scales to fit the screen.
4. Widgets that need external data fetch it client-side, optionally routing through a CORS proxy.

## Available widgets

| Widget | Type key | Description |
|--------|----------|-------------|
| Clock | `clock` | Digital clock with date, 12/24h formats |
| Poster Carousel | `poster-carousel` | Rotating image slides with titles |
| Events List | `events-list` | Upcoming events from static data or iCal feeds |
| News Ticker | `news-ticker` | Scrolling headline bar from RSS feeds |
| Weather | `weather` | Current conditions via Open-Meteo |
| YouTube | `youtube` | Embedded YouTube player |
| Web Embed | `web` | Any website in an iframe |
| Image | `image` | Single image display |
| Media Player | `media-player` | HTML5 audio/video player |
| Slideshow | `slideshow` | Full-screen image slideshow with transitions |
| Poster Feed | `poster-feed` | Images loaded from an RSS feed |
| Bus Connection | `bus-connection` | GTFS real-time transit departures |
| QR Code | `qrcode` | Dynamic QR code generation |
| Climbing Gym | `climbing-gym` | Climbing gym occupancy display |
| Widget Stack | `widget-stack` | Stack multiple widgets with auto-rotation |

## Tech stack

- **Next.js 16** with static export (`output: "export"`)
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **GridStack.js** for the drag-and-drop editor
- **lz-string** for URL compression
