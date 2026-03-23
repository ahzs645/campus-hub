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

## Deployment

Deployed to GitHub Pages via the `.github/workflows/deploy.yml` workflow. The workflow automatically checks out all three repos and builds the static export.

Triggered on push to `main` or manually via workflow dispatch.
