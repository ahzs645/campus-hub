---
title: External Data Sources
description: How to connect Campus Hub to external databases, APIs, and feeds.
draft: false
---

Campus Hub is a static client-side application — it has no backend server. All external data is fetched directly from the browser at runtime. This guide explains the patterns for connecting to different data sources.

## Architecture overview

```
┌─────────────────────────────────────────┐
│              Browser                     │
│                                          │
│  Widget ──▶ fetchJsonWithCache()         │
│              │                           │
│              ├── Memory cache (Map)      │
│              ├── localStorage cache      │
│              └── fetch() ──▶ CORS Proxy  │
│                                  │       │
└──────────────────────────────────┼───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              REST API       RSS/iCal        Static JSON
             (weather)      (events)      (configs, playlists)
```

All fetching goes through the `data-cache` module (`src/lib/data-cache.ts`), which provides:

- **Two-layer cache** — in-memory `Map` + `localStorage` for persistence across page reloads.
- **TTL-based expiry** — each entry has a configurable time-to-live.
- **Stale-while-revalidate** — if a fresh fetch fails, the last cached value is returned.

## Supported data formats

### RSS feeds

Widgets like **News Ticker** and **Poster Feed** parse RSS/XML feeds using the browser's `DOMParser`:

```typescript
import { parseRss } from '@/lib/feeds';
import { fetchTextWithCache, buildProxyUrl } from '@/lib/data-cache';

const url = buildProxyUrl(corsProxy, 'https://news.example.com/rss');
const { text } = await fetchTextWithCache(url, { ttlMs: 5 * 60_000 });
const items = parseRss(text);
// items: [{ title, link, pubDate, description, categories }, ...]
```

### iCal calendars

The **Events List** widget can parse `.ics` calendar files:

```typescript
import { parseICal } from '@/lib/feeds';

const { text } = await fetchTextWithCache(url, { ttlMs: 5 * 60_000 });
const events = parseICal(text);
// events: [{ summary, start, end, location, description, url }, ...]
```

Supported iCal date formats:
- Date-only: `20260224`
- UTC datetime: `20260224T120000Z`
- Local datetime: `20260224T120000`

### JSON APIs

For REST APIs that return JSON (e.g., weather, occupancy data):

```typescript
import { fetchJsonWithCache, buildProxyUrl, buildCacheKey } from '@/lib/data-cache';

const targetUrl = 'https://api.example.com/data';
const url = buildProxyUrl(corsProxy, targetUrl);
const { data } = await fetchJsonWithCache<MyDataType>(url, {
  cacheKey: buildCacheKey('my-widget', targetUrl),
  ttlMs: 60_000,
  allowStale: true,
});
```

### GTFS real-time

The **Bus Connection** widget uses Protocol Buffers to decode GTFS-RT feeds. This requires the `gtfs-realtime-bindings` package and fetches binary data:

```typescript
const response = await fetch(buildProxyUrl(corsProxy, gtfsUrl));
const buffer = await response.arrayBuffer();
const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
  new Uint8Array(buffer)
);
```

## Connecting to your own database

Since Campus Hub runs entirely in the browser, it cannot directly connect to databases like PostgreSQL, MySQL, or MongoDB. Instead, create a lightweight API that your widgets can fetch from.

### Option 1 — Static JSON files

For data that changes infrequently (room schedules, directory listings), generate JSON files during your build/deploy process and serve them as static assets:

```
public/
  data/
    events.json
    rooms.json
    schedules.json
```

Widgets can fetch these without a CORS proxy since they're on the same origin:

```typescript
const { data } = await fetchJsonWithCache<Event[]>('/data/events.json', {
  ttlMs: 5 * 60_000,
});
```

### Option 2 — Cloudflare Workers + D1/KV

Use a Cloudflare Worker with [D1](https://developers.cloudflare.com/d1/) (SQLite) or [KV](https://developers.cloudflare.com/kv/) as the backing store:

```javascript
// Worker that reads from D1
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/events') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM events WHERE date >= date("now") ORDER BY date LIMIT 20'
      ).all();

      return Response.json(results, {
        headers: {
          'Access-Control-Allow-Origin': 'https://campus.ahmadjalil.com',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

### Option 3 — Supabase / Firebase

Use a hosted database service that provides a REST API with CORS support built in:

- **Supabase** — Postgres with auto-generated REST API. CORS is configured in the dashboard.
- **Firebase Realtime Database / Firestore** — JSON APIs with Firebase SDK or REST calls.

These services handle CORS headers for you, so no proxy is needed.

### Option 4 — Your own API server

Run any backend (Express, FastAPI, Go, etc.) that returns JSON and sets CORS headers:

```javascript
// Express example
app.use(cors({ origin: 'https://campus.ahmadjalil.com' }));

app.get('/api/events', async (req, res) => {
  const events = await db.query('SELECT * FROM events WHERE ...');
  res.json(events);
});
```

## Cache behavior

The `data-cache` module provides automatic caching:

| Property | Default | Description |
|----------|---------|-------------|
| `ttlMs` | 60,000 (1 min) | How long a cached entry is considered fresh |
| `allowStale` | `true` | Whether to return expired cache entries when a fetch fails |
| `cacheKey` | Auto-generated | Key used for both in-memory and localStorage caches |

Cache entries are stored in localStorage with the prefix `campus-hub:cache:` and a hashed key. This means data persists across page refreshes and browser restarts.

## Best practices

1. **Cache aggressively** — displays run 24/7. Set `ttlMs` to at least 60 seconds to avoid hammering upstream APIs.
2. **Enable stale fallback** — use `allowStale: true` so widgets continue showing data during temporary network failures.
3. **Use specific cache keys** — use `buildCacheKey('widget-name', url)` to avoid collisions between widgets fetching different data.
4. **Handle errors gracefully** — widgets should show a meaningful fallback state when data fails to load, not a blank space.
5. **Prefer CORS-friendly APIs** — if you control the API, set proper CORS headers instead of routing through a proxy.
