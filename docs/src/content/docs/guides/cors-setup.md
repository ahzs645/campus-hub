---
title: CORS & Proxies
description: Setting up CORS proxies for external data fetching.
draft: false
---

Many Campus Hub widgets fetch data from external APIs (weather services, RSS feeds, iCal calendars). Since the app runs entirely in the browser, these requests are subject to [CORS (Cross-Origin Resource Sharing)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) restrictions. A CORS proxy solves this by forwarding requests through a server you control.

## Why you need a CORS proxy

When a widget tries to fetch `https://api.example.com/data` from the browser, the browser blocks the request unless `api.example.com` includes the correct `Access-Control-Allow-Origin` header. Most third-party APIs and feed servers do not set this header for browser requests.

A CORS proxy sits between the browser and the API:

```
Browser ──▶ Your CORS Proxy ──▶ External API
       ◀──                  ◀──
       (with CORS headers)
```

## Configuring the proxy in Campus Hub

Set the **CORS Proxy URL** in the configurator sidebar under **Settings**:

```
https://your-worker.example.com
```

Campus Hub constructs proxied URLs using this format:

```
{proxyBase}/?url={encodedTargetUrl}
```

For example, if your proxy is `https://cors.example.com` and the widget needs to fetch `https://api.weather.com/forecast`, the actual request will be:

```
https://cors.example.com/?url=https%3A%2F%2Fapi.weather.com%2Fforecast
```

The proxy is set at the global level in the configuration and passed to every widget that needs it.

## Widgets that use the proxy

| Widget | What it fetches |
|--------|----------------|
| Weather | Open-Meteo geocoding and forecast APIs |
| News Ticker | RSS feed URLs |
| Events List | iCal (.ics) calendar URLs |
| Poster Feed | RSS feeds for image URLs |
| Bus Connection | GTFS real-time transit feeds |
| Climbing Gym | Occupancy data APIs |

Widgets like Clock, YouTube, Image, and QR Code do not need a proxy since they either generate content locally or use browser-native embedding.

## Deploy your own Cloudflare Worker

The recommended approach is deploying a Cloudflare Worker as your CORS proxy. It's free for up to 100,000 requests/day.

### Step 1 — Create a Cloudflare account

Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) if you don't have one.

### Step 2 — Create a Worker

Go to **Workers & Pages** > **Create** > **Create Worker**.

### Step 3 — Paste the Worker code

Replace the default code with:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    // Optional: restrict to your domain
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = [
      'https://campus.ahmadjalil.com',
      'http://localhost:3000',
    ];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'CampusHub-CORSProxy/1.0',
        },
      });

      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
      newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      return new Response(`Proxy error: ${error.message}`, { status: 502 });
    }
  },
};
```

### Step 4 — Deploy

Click **Deploy**. Your worker will be available at a URL like:

```
https://campus-cors.your-account.workers.dev
```

### Step 5 — Configure in Campus Hub

Enter the worker URL in the CORS Proxy URL field:

```
https://campus-cors.your-account.workers.dev
```

### Custom domain (optional)

In your Worker's settings, go to **Triggers** > **Custom Domains** to add a subdomain like `cors.yourdomain.com`.

## Alternative: Cloudflare Pages Function

If you're already hosting Campus Hub on Cloudflare Pages, you can add a Pages Function instead of a separate Worker.

Create `functions/api/proxy.js` in your project:

```javascript
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get('url');

  if (!target) {
    return new Response('Missing url param', { status: 400 });
  }

  const response = await fetch(target);
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

Then set your CORS proxy URL to:

```
https://campus.ahmadjalil.com/api/proxy
```

## Alternative: Vercel Edge Function

If hosting on Vercel, create `api/proxy.ts`:

```typescript
import type { NextRequest } from 'next/server';

export const config = { runtime: 'edge' };

export default async function handler(req: NextRequest) {
  const target = new URL(req.url).searchParams.get('url');
  if (!target) return new Response('Missing url', { status: 400 });

  const resp = await fetch(target);
  const headers = new Headers(resp.headers);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(resp.body, { status: resp.status, headers });
}
```

## Security considerations

- **Restrict origins** — don't use `Access-Control-Allow-Origin: *` in production. Limit it to your actual domain(s).
- **Rate limiting** — Cloudflare Workers have built-in rate limiting you can configure in the dashboard.
- **URL allowlisting** — consider restricting which target URLs the proxy will fetch to prevent abuse (e.g., only allow weather APIs and RSS feeds).
- **Caching** — add `Cache-Control` headers in your proxy to reduce the load on upstream APIs. Campus Hub already caches responses client-side, but proxy-level caching helps with multiple concurrent displays.

## Troubleshooting

### Widgets show "Failed to load" or remain empty

1. Open the browser dev tools (F12) and check the **Network** tab.
2. Look for failed requests — if you see CORS errors, your proxy is either not configured or not returning the correct headers.
3. Verify the proxy URL is set in **Settings** > **CORS Proxy URL**.

### Proxy returns 502 errors

The upstream API may be down or blocking your proxy's IP. Try fetching the target URL directly from your terminal:

```bash
curl -I "https://api.example.com/data"
```

### Old configs still use defunct proxies

Campus Hub automatically migrates known defunct third-party proxy URLs (like `corsproxy.io`, `cors.lol`, `allorigins.win`) to an empty string, falling back to direct requests. If you see issues with old shared links, the config migration handles this transparently.
