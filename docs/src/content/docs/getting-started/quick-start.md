---
title: Quick Start
description: Get Campus Hub running locally in minutes.
draft: false
---

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)

## Clone and install

```bash
git clone https://github.com/ahzs645/campus-hub.git
cd campus-hub
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Key routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/configure` | Drag-and-drop layout editor |
| `/display?config=...` | Rendered display (for screens) |

## Build for production

```bash
npm run build
```

This generates a static site in the `out/` directory. Deploy it to any static host:

- **Cloudflare Pages** — connect your repo and set `npm run build` as the build command, `out` as the output directory.
- **GitHub Pages** — push the `out/` folder or use a CI action.
- **Any CDN** — upload the `out/` directory contents.

## Try the configurator

1. Navigate to `/configure`.
2. Click **Add Widget** to open the widget library.
3. Select a widget — it snaps into the first available grid slot.
4. Drag widgets to reposition, use the corner handles to resize.
5. Open the **Settings** tab to change colors, school name, and CORS proxy.
6. Click **Generate URL** to get a shareable link.
7. Open the URL on a display screen or in a new tab.

## Load a preset

The **Presets** tab in the configurator sidebar provides several pre-built layouts:

- **Campus Classic** — clock, poster carousel, events, and news ticker
- **Media Showcase** — YouTube video with supporting images
- **Minimal Info** — clean clock and weather display
- **Events Focus** — large event list with posters
- **Web Dashboard** — embedded website with clock and weather
- **Photo Gallery** — full slideshow with side events

Select any preset to instantly load its layout and theme.
