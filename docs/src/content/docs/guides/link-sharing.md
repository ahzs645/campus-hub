---
title: Link Sharing
description: How Campus Hub encodes display configurations into shareable URLs.
draft: false
---

Campus Hub stores the entire display configuration in the URL itself. There is no database — sharing a display is as simple as sharing a link.

## How it works

```
https://campus.ahmadjalil.com/display?config=NobwRALg...
                                              ▲
                                              │
                          Compact `json-url` share token
```

1. The configurator serializes the `DisplayConfig` object to JSON.
2. [`@firstform/json-url`](https://www.npmjs.com/package/@firstform/json-url) tries multiple web-share codecs and keeps the shortest token.
3. The compressed string is appended as the `config` query parameter.
4. The display page reads the parameter, decompresses it, and renders the layout.

### Encoding

```typescript
import { encodeConfig } from '@/lib/config';

const encoded = await encodeConfig(config);
const url = `${origin}/display?config=${encoded}`;
```

Typical new tokens are prefixed like `1.br.<payload>` or `1.df.<payload>`, which lets the decoder identify the codec automatically.

### Decoding

```typescript
import { decodeConfig } from '@/lib/config';

const encoded = searchParams.get('config');
const config = encoded ? await decodeConfig(encoded) : null;
```

The app also supports legacy prefixless `lz` tokens and base64url tokens as fallbacks, so older shared links continue to load.

## URL length considerations

Typical URL lengths for different setups:

| Layout complexity | Approximate URL length |
|-------------------|----------------------|
| 2–3 simple widgets | ~500–1,000 characters |
| Full layout (6–8 widgets) | ~2,000–4,000 characters |
| Complex layout with poster data | ~5,000–10,000 characters |

Most browsers and servers handle URLs up to ~8,000 characters without issue. For very complex layouts, consider using `configUrl` instead (see below).

## Alternative: external config URL

For configs that are too large for a URL, or when you want to update displays without changing the link, use the `configUrl` parameter:

```
https://campus.ahmadjalil.com/display?configUrl=/configs/lobby.json
```

The display page fetches the JSON from the given URL, which can be:

- A relative path to a static JSON file in your deployment
- An absolute URL to an external API endpoint
- A URL to a cloud storage object (S3, R2, etc.)

The fetched config is cached in memory and localStorage for 5 minutes.

## Playlists

For displays that rotate through multiple configurations, use playlists:

```
https://campus.ahmadjalil.com/display?playlistUrl=/playlists/main.json
```

A playlist JSON file looks like:

```json
{
  "name": "Main Lobby Rotation",
  "loop": true,
  "items": [
    {
      "configUrl": "/configs/welcome.json",
      "durationSeconds": 30
    },
    {
      "configUrl": "/configs/events.json",
      "durationSeconds": 20
    },
    {
      "config": { "...inline DisplayConfig..." },
      "durationSeconds": 15
    }
  ]
}
```

Each item can specify either:
- `configUrl` — a URL to fetch the config from
- `config` — an inline `DisplayConfig` object

The display cycles through items, showing each for its `durationSeconds` (default 30s, minimum 5s).

## Screen maps

For managing multiple physical screens from a single JSON, use screen maps:

```
https://campus.ahmadjalil.com/display?screen=lobby-1&screenUrl=/screens.json
```

A `screens.json` file maps screen IDs to their configs or playlists:

```json
{
  "screens": {
    "lobby-1": {
      "name": "Main Lobby",
      "configUrl": "/configs/lobby.json"
    },
    "cafeteria": {
      "name": "Cafeteria Display",
      "playlistUrl": "/playlists/cafeteria.json"
    }
  }
}
```

This is useful when managing a fleet of displays — each screen is identified by its `screen` parameter, and you update the central `screens.json` to change what any display shows.

## JSON export/import

The configurator also supports exporting and importing configurations as JSON files:

- **Export** — downloads a `campus-hub-config-<timestamp>.json` file containing the full config wrapped in a metadata envelope.
- **Import** — uploads a previously exported JSON file to restore a layout.

The exported format:

```json
{
  "version": 1,
  "exportedAt": "2026-02-24T12:00:00.000Z",
  "config": {
    "layout": [...],
    "theme": {...},
    "schoolName": "...",
    "tickerEnabled": true
  }
}
```
