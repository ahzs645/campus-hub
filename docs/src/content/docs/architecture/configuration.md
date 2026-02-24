---
title: Configuration Format
description: The DisplayConfig schema and how it's used.
draft: false
---

The configuration format defines everything about a display — its layout, theme, widgets, and settings. Understanding this format is essential for working with Campus Hub programmatically.

## DisplayConfig

The root configuration object:

```typescript
interface DisplayConfig {
  layout: WidgetConfig[];     // Widget positions and settings
  theme: {
    primary: string;          // Primary color (hex)
    accent: string;           // Accent color (hex)
    background: string;       // Background color (hex)
  };
  schoolName: string;         // Display title (shown in header)
  tickerEnabled: boolean;     // Whether the news ticker is active
  comingSoon?: boolean;       // Blur overlay with "Coming Soon" text
  gridRows?: number;          // Grid row count (default: 8)
  gridCols?: number;          // Grid column count (default: 12)
  logo?: LogoConfig;          // Optional logo
  aspectRatio?: number;       // Display aspect ratio (default: 16/9)
  corsProxy?: string;         // CORS proxy base URL
}
```

## WidgetConfig

Each widget in the layout:

```typescript
interface WidgetConfig {
  id: string;                 // Unique identifier (e.g. "clock-1")
  type: string;               // Widget type (e.g. "clock", "weather")
  x: number;                  // Grid column position (0-based)
  y: number;                  // Grid row position (0-based)
  w: number;                  // Width in grid columns
  h: number;                  // Height in grid rows
  props?: Record<string, unknown>;  // Widget-specific options
  comingSoon?: boolean;       // Per-widget "Coming Soon" overlay
}
```

### Grid coordinates

The grid is 0-indexed. A widget at position `(0, 0)` with size `(3, 2)` occupies columns 0–2 and rows 0–1:

```
     0   1   2   3   4   5   ...  11
   ┌───┬───┬───┬───┬───┬───┬────┬───┐
0  │ widget  │   │   │   │    │   │
   ├───┤     ├───┼───┼───┼────┼───┤
1  │         │   │   │   │    │   │
   ├───┼───┼───┼───┼───┼───┼────┼───┤
2  │   │   │   │   │   │   │    │   │
```

## LogoConfig

```typescript
interface LogoConfig {
  type: 'svg' | 'url';       // Logo source type
  value: string;              // SVG markup or image URL
}
```

## Default configuration

When no config is provided, this default is used:

```json
{
  "layout": [
    { "id": "clock-1", "type": "clock", "x": 10, "y": 0, "w": 2, "h": 1 },
    { "id": "poster-1", "type": "poster-carousel", "x": 0, "y": 1, "w": 8, "h": 5,
      "props": { "rotationSeconds": 10 } },
    { "id": "events-1", "type": "events-list", "x": 8, "y": 1, "w": 4, "h": 3 },
    { "id": "news-ticker-1", "type": "news-ticker", "x": 0, "y": 7, "w": 12, "h": 1 }
  ],
  "theme": {
    "primary": "#035642",
    "accent": "#B79527",
    "background": "#022b21"
  },
  "schoolName": "Campus Hub",
  "tickerEnabled": true,
  "gridRows": 8,
  "corsProxy": ""
}
```

## Normalization

The `normalizeConfig()` function validates and fills defaults for any missing or corrupted fields:

- Missing layout entries get default positions
- Invalid colors fall back to the default theme
- Empty school names are replaced with "Campus Hub"
- Unknown fields are silently ignored
- Defunct CORS proxy URLs (from old third-party services) are automatically cleared

This allows Campus Hub to gracefully handle configs from older versions or manually edited JSON.

## Encoding and decoding

### URL encoding

```typescript
import { encodeConfig, decodeConfig } from '@/lib/config';

// Encode: DisplayConfig → compressed string
const encoded = encodeConfig(config);

// Decode: compressed string → DisplayConfig
const config = decodeConfig(encoded);
```

The encoding uses `lz-string`'s `compressToEncodedURIComponent`, which produces URL-safe strings without base64 padding issues.

### Export format

The JSON export wraps the config in a versioned envelope:

```json
{
  "version": 1,
  "exportedAt": "2026-02-24T12:00:00.000Z",
  "config": { "...DisplayConfig..." }
}
```

## Bounds filtering

Before exporting or generating a share URL, `filterInBoundsLayout()` removes widgets that fall outside the grid boundaries:

```typescript
import { filterInBoundsLayout } from '@/lib/config';

const exported = filterInBoundsLayout(config);
// Only includes widgets where x+w <= cols and y+h <= rows
```

This prevents off-grid widgets (shown with an "OFF GRID" badge in the configurator) from appearing in the shared display.
