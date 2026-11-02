'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  decodeConfig,
  DEFAULT_CONFIG,
  normalizeConfig,
  type DisplayConfig,
  type WidgetConfig,
} from '@/lib/config';
import { createSignalingClient, type SignalingClient } from '@/lib/signaling-client';
import {
  buildCacheKey,
  fetchJsonWithCache,
  preloadDisplayWidgetComponent,
  WidgetRenderer,
} from '@firstform/campus-hub-engine';
import '@firstform/campus-hub-engine/widgets';

interface PlaylistItem {
  id?: string;
  durationSeconds?: number;
  config?: DisplayConfig;
  configUrl?: string;
}

interface Playlist {
  name?: string;
  loop?: boolean;
  items: PlaylistItem[];
}

interface ScreenMap {
  screens?: Record<
    string,
    {
      name?: string;
      configUrl?: string;
      playlistUrl?: string;
    }
  >;
  groups?: Record<string, string[]>;
}

// localStorage key for the signaling shared secret (SIGNALING_AUTH_TOKEN).
const SIGNALING_TOKEN_STORAGE_KEY = 'campus-hub:signaling-token';

// Only http(s) URLs may be navigated to or fetched from a remotely pushed
// config. Rejects javascript:, data:, file: etc.
const isHttpUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const { protocol } = new URL(value, window.location.origin + '/');
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const resolveUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, window.location.origin + '/').toString();
  } catch {
    return trimmed;
  }
};

// Query parameters that select what the display shows. A `reset` action drops
// these so the display falls back to its default configuration while keeping
// its signaling connection parameters.
const CONFIG_SELECTION_PARAMS = [
  'config',
  'configJson',
  'configUrl',
  'playlistUrl',
  'screen',
  'screenUrl',
];

// Origins allowed to push configs through the postMessage bridge, in addition
// to this page's own origin. Comma-separated, set at build time.
const ENV_ALLOWED_MESSAGE_ORIGINS = (process.env.NEXT_PUBLIC_DISPLAY_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const normalizeOrigin = (value: string): string | null => {
  try {
    const { origin } = new URL(value);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

// Viewport size as a primitive snapshot ("width x height"), so the display can
// derive its scale during render instead of mirroring it into state.
// visualViewport.scale compensates for pinch-zoom so the layout stays based on
// the *layout* viewport, not the zoomed visual viewport (window.innerWidth and
// innerHeight shrink when the user pinch-zooms, which would otherwise cause a
// resize feedback loop).
const subscribeViewport = (onChange: () => void) => {
  const target = window.visualViewport ?? window;
  target.addEventListener('resize', onChange);
  return () => target.removeEventListener('resize', onChange);
};
const getViewportSnapshot = () => {
  const vv = window.visualViewport;
  const vw = vv ? vv.width * vv.scale : window.innerWidth;
  const vh = vv ? vv.height * vv.scale : window.innerHeight;
  return `${vw}x${vh}`;
};
const getServerViewportSnapshot = () => null;

const parseConfigJsonParam = (value: string): DisplayConfig | null => {
  const candidates = [value];

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {}

  for (const candidate of candidates) {
    try {
      return normalizeConfig(JSON.parse(candidate) as DisplayConfig);
    } catch {}
  }

  return null;
};

function DisplayContent() {
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const [activeConfig, setActiveConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Latest config, readable from long-lived signaling handlers.
  const activeConfigRef = useRef(activeConfig);
  useEffect(() => {
    activeConfigRef.current = activeConfig;
  }, [activeConfig]);

  useEffect(() => {
    let isMounted = true;

    const resolveConfig = async () => {
      setLoading(true);
      let resolvedConfig: DisplayConfig | null = null;
      let resolvedPlaylist: Playlist | null = null;

      let configUrl = searchParams.get('configUrl');
      let playlistUrl = searchParams.get('playlistUrl');

      const screenId = searchParams.get('screen');
      const screenUrlParam = searchParams.get('screenUrl');

      if (screenId) {
        const screenMapUrl = resolveUrl(screenUrlParam || '/screens.json');
        try {
          const { data } = await fetchJsonWithCache<ScreenMap>(screenMapUrl, {
            cacheKey: buildCacheKey('screen-map', screenMapUrl),
            ttlMs: 5 * 60 * 1000,
          });
          const screenEntry = data?.screens?.[screenId];
          if (screenEntry?.playlistUrl) playlistUrl = screenEntry.playlistUrl;
          if (screenEntry?.configUrl) configUrl = screenEntry.configUrl;
        } catch (error) {
          console.error('Failed to load screen map:', error);
        }
      }

      if (playlistUrl) {
        const resolvedUrl = resolveUrl(playlistUrl);
        try {
          const { data } = await fetchJsonWithCache<Playlist>(resolvedUrl, {
            cacheKey: buildCacheKey('playlist', resolvedUrl),
            ttlMs: 5 * 60 * 1000,
          });
          if (data?.items?.length) {
            resolvedPlaylist = data;
          }
        } catch (error) {
          console.error('Failed to load playlist:', error);
        }
      }

      if (!resolvedPlaylist && configUrl) {
        const resolvedUrl = resolveUrl(configUrl);
        try {
          const { data } = await fetchJsonWithCache<DisplayConfig>(resolvedUrl, {
            cacheKey: buildCacheKey('config', resolvedUrl),
            ttlMs: 5 * 60 * 1000,
          });
          resolvedConfig = normalizeConfig(data);
        } catch (error) {
          console.error('Failed to load config URL:', error);
        }
      }

      if (!resolvedPlaylist && !resolvedConfig) {
        const configParam = searchParams.get('config');
        if (configParam) {
          const decoded = await decodeConfig(configParam);
          if (decoded) resolvedConfig = decoded;
        }
      }

      if (!resolvedPlaylist && !resolvedConfig) {
        const configJsonParam = searchParams.get('configJson');
        if (configJsonParam) {
          resolvedConfig = parseConfigJsonParam(configJsonParam);
          if (!resolvedConfig) {
            console.error('Failed to parse configJson');
          }
        }
      }

      if (!resolvedPlaylist && !resolvedConfig) {
        resolvedConfig = DEFAULT_CONFIG;
      }

      if (!isMounted) return;
      setPlaylist(resolvedPlaylist);
      setCurrentIndex(0);
      setActiveConfig(resolvedConfig ?? DEFAULT_CONFIG);
      setLoading(false);
    };

    resolveConfig();

    return () => {
      isMounted = false;
    };
  }, [paramsKey]);

  // === Signaling server connection ===
  // When ?signal=ws://server:3030&displayId=lobby-1 are present,
  // the display connects to the signaling server and listens for
  // remote config pushes and actions from controllers.
  // The shared secret comes from ?signalingToken=... (persisted to
  // localStorage so subsequent loads can omit it) or from localStorage.
  useEffect(() => {
    const signalUrl = searchParams.get('signal');
    const displayId = searchParams.get('displayId');
    if (!signalUrl || !displayId) return;

    let token = searchParams.get('signalingToken') || '';
    try {
      if (token) {
        localStorage.setItem(SIGNALING_TOKEN_STORAGE_KEY, token);
      } else {
        token = localStorage.getItem(SIGNALING_TOKEN_STORAGE_KEY) || '';
      }
    } catch {}
    if (!token) {
      console.error('[signaling] No signaling token: pass ?signalingToken=... once (it is remembered in localStorage)');
      return;
    }

    // Report the current URL without the secret so it is not echoed to controllers.
    const reportedUrl = new URL(window.location.href);
    reportedUrl.searchParams.delete('signalingToken');

    let client: SignalingClient | null = null;

    const setup = async () => {
      client = createSignalingClient(signalUrl, 'display', displayId, {
        name: searchParams.get('displayName') || displayId,
        currentConfig: reportedUrl.toString(),
        token,
      });

      client.on('apply-config', async (data) => {
        const config = data.config as { type: string; value: string } | undefined;
        if (!config) return;

        let newConfig: DisplayConfig | null = null;

        if (config.type === 'url') {
          // Navigate to the new display URL — http(s) only.
          if (!isHttpUrl(config.value)) {
            console.error('[signaling] Ignoring non-http(s) url push');
            client?.reportStatus({ error: 'Rejected non-http(s) URL' });
            return;
          }
          window.location.href = config.value;
          return;
        } else if (config.type === 'configUrl') {
          if (!isHttpUrl(config.value)) {
            console.error('[signaling] Ignoring non-http(s) configUrl push');
            client?.reportStatus({ error: 'Rejected non-http(s) config URL' });
            return;
          }
          try {
            const { data: fetched } = await fetchJsonWithCache<DisplayConfig>(
              resolveUrl(config.value),
              { cacheKey: buildCacheKey('signal-config', config.value), ttlMs: 60_000 }
            );
            newConfig = normalizeConfig(fetched);
          } catch (e) {
            console.error('[signaling] Failed to fetch configUrl:', e);
            client?.reportStatus({ error: 'Failed to fetch config URL' });
          }
        } else if (config.type === 'playlistUrl') {
          if (!isHttpUrl(config.value)) {
            console.error('[signaling] Ignoring non-http(s) playlistUrl push');
            client?.reportStatus({ error: 'Rejected non-http(s) playlist URL' });
            return;
          }
          // Reload with new playlist
          const url = new URL(window.location.href);
          url.searchParams.set('playlistUrl', config.value);
          window.location.href = url.toString();
          return;
        } else if (config.type === 'json') {
          try {
            newConfig = normalizeConfig(
              typeof config.value === 'string' ? JSON.parse(config.value) : config.value
            );
          } catch (e) {
            console.error('[signaling] Invalid JSON config:', e);
            client?.reportStatus({ error: 'Invalid JSON config' });
          }
        }

        if (newConfig) {
          setPlaylist(null);
          setActiveConfig(newConfig);
          client?.reportStatus({ applied: true, type: config.type });
        }
      });

      client.on('apply-action', (data) => {
        const action = data.action as string;
        const ack = (extra: Record<string, unknown> = {}) =>
          client?.reportStatus({ action, ok: true, ...extra });

        if (action === 'reload') {
          ack();
          // Give the acknowledgement a moment to flush before the page unloads.
          setTimeout(() => window.location.reload(), 150);
        } else if (action === 'identify') {
          // Flash the display ID on screen briefly
          const el = document.createElement('div');
          el.textContent = displayId;
          Object.assign(el.style, {
            position: 'fixed', inset: '0', zIndex: '9999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8vw', fontWeight: 'bold', color: '#fff',
            background: 'rgba(0,0,0,0.8)',
          });
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 3000);
          ack();
        } else if (action === 'reset') {
          // Mirror the TV shell's reset: drop whatever config was selected and
          // fall back to the default config, keeping the signaling connection.
          setPlaylist(null);
          setActiveConfig(DEFAULT_CONFIG);
          ack();
          const url = new URL(window.location.href);
          for (const param of CONFIG_SELECTION_PARAMS) url.searchParams.delete(param);
          url.searchParams.delete('signalingToken'); // already persisted to localStorage
          setTimeout(() => window.location.replace(url.toString()), 150);
        } else if (action === 'info') {
          const current = activeConfigRef.current;
          ack({
            info: {
              displayId,
              name: searchParams.get('displayName') || displayId,
              currentUrl: reportedUrl.toString(),
              widgetCount: current.layout.length,
              grid: `${current.gridCols ?? 12}x${current.gridRows ?? 8}`,
              userAgent: navigator.userAgent,
              viewport: `${window.innerWidth}x${window.innerHeight}`,
            },
          });
        } else {
          client?.reportStatus({ action, error: `Unsupported action "${action}"` });
        }
      });

      client.on('connected', () => console.log(`[signaling] Connected as display "${displayId}"`));
      client.on('error', (data) => console.error('[signaling] Error:', data.message));
      client.on('disconnected', () => console.log('[signaling] Disconnected, will reconnect...'));

      await client.connect();
    };

    setup();

    return () => { client?.disconnect(); };
  }, [searchParams]);

  // === postMessage bridge ===
  // Allows an embedding parent frame (or the window that opened this display)
  // to push configs. Messages are only accepted from that window, and only
  // from this page's own origin, origins in NEXT_PUBLIC_DISPLAY_ALLOWED_ORIGINS,
  // or the origin named by ?parentOrigin=.
  useEffect(() => {
    const allowedOrigins = new Set<string>([window.location.origin]);
    for (const origin of ENV_ALLOWED_MESSAGE_ORIGINS) {
      const normalized = normalizeOrigin(origin);
      if (normalized) allowedOrigins.add(normalized);
    }
    const parentOrigin = new URLSearchParams(window.location.search).get('parentOrigin');
    const normalizedParent = parentOrigin ? normalizeOrigin(parentOrigin) : null;
    if (normalizedParent) allowedOrigins.add(normalizedParent);

    const handler = (event: MessageEvent) => {
      const fromHost =
        event.source !== null &&
        ((window.parent !== window && event.source === window.parent) ||
          (window.opener && event.source === window.opener));
      if (!fromHost || !allowedOrigins.has(event.origin)) return;

      if (event.data?.type === 'campus-hub-config' && event.data?.config) {
        const config = normalizeConfig(event.data.config);
        if (config) {
          setActiveConfig(config);
          setPlaylist(null);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;

    let isMounted = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const loadPlaylistItem = async () => {
      const item = playlist.items[currentIndex];
      if (!item) return;

      if (item.config) {
        setActiveConfig(normalizeConfig(item.config));
      } else if (item.configUrl) {
        const resolvedUrl = resolveUrl(item.configUrl);
        try {
          const { data } = await fetchJsonWithCache<DisplayConfig>(resolvedUrl, {
            cacheKey: buildCacheKey('playlist-config', resolvedUrl),
            ttlMs: 5 * 60 * 1000,
          });
          if (isMounted) setActiveConfig(normalizeConfig(data));
        } catch (error) {
          console.error('Failed to load playlist config:', error);
        }
      }

      const duration = Math.max(5, item.durationSeconds ?? 30);
      const isLast = currentIndex >= playlist.items.length - 1;
      const shouldLoop = playlist.loop !== false;
      if (shouldLoop || !isLast) {
        timeout = setTimeout(() => {
          setCurrentIndex((prev) => {
            const next = prev + 1;
            if (next >= playlist.items.length) return shouldLoop ? 0 : prev;
            return next;
          });
        }, duration * 1000);
      }
    };

    loadPlaylistItem();

    return () => {
      isMounted = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [playlist, currentIndex]);

  const config: DisplayConfig = activeConfig;

  const gridRows = config.gridRows ?? 8;
  const gridCols = config.gridCols ?? 12;
  const layout: WidgetConfig[] = useMemo(() => {
    if (config.tickerEnabled && !config.layout.some((w) => w.type === 'news-ticker')) {
      const tickerWidget: WidgetConfig = {
        id: 'default-ticker',
        type: 'news-ticker',
        x: 0,
        y: gridRows - 1,
        w: gridCols,
        h: 1,
      };
      return [...config.layout, tickerWidget];
    }
    return config.layout;
  }, [config, gridRows, gridCols]);

  // Fixed reference resolution — the layout is rendered at this size and then
  // uniformly scaled (via CSS transform) to fill the actual viewport.
  // This ensures pixel-perfect consistency across all screen sizes.
  const REF_HEIGHT = 1080;
  const configAspectRatio = config.aspectRatio ?? 16 / 9;
  const REF_WIDTH = Math.round(REF_HEIGHT * configAspectRatio);

  const viewport = useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    getServerViewportSnapshot,
  );
  const scale = useMemo(() => {
    if (!viewport) return 1;
    const [vw, vh] = viewport.split('x').map(Number);
    // Scale to fit: pick the smaller ratio so nothing overflows
    return Math.min(vw / REF_WIDTH, vh / REF_HEIGHT);
  }, [viewport, REF_WIDTH]);

  // Grid margin matches the editor formula: height * 0.0075
  const gridMargin = Math.max(2, Math.round(REF_HEIGHT * 0.0075));

  useEffect(() => {
    layout.forEach((widget) => preloadDisplayWidgetComponent(widget.type));
  }, [layout]);

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: config.theme.background, touchAction: 'none' }}
    >
      {/* Scaled container — rendered at fixed reference resolution, then scaled to fit viewport */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: REF_WIDTH,
          height: REF_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          backgroundColor: config.theme.background,
          '--background': config.theme.background,
          '--foreground': '#ffffff',
          '--color-primary': config.theme.primary,
          '--color-accent': config.theme.accent,
        } as React.CSSProperties}
      >
        <div className="w-full h-full flex flex-col text-white overflow-hidden relative">

          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-white/70 text-lg">Loading display…</div>
            </div>
          )}

          {/* Full-page Coming Soon overlay */}
          {config.comingSoon && !loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <span
                className="text-3xl font-bold tracking-widest uppercase px-8 py-4 rounded-2xl backdrop-blur-sm"
                style={{ color: config.theme.accent, backgroundColor: `${config.theme.primary}80` }}
              >
                Coming Soon
              </span>
            </div>
          )}

          {/* CSS Grid Layout — fixed px spacing matches the editor exactly */}
          <div
            className={`flex-1 min-h-0${config.comingSoon ? ' blur-sm grayscale pointer-events-none select-none' : ''}`}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${gridRows}, 1fr)`,
              gap: `${gridMargin * 2}px`,
              padding: `${gridMargin}px`,
            }}
          >
            {layout.map((widget) => (
              <div
                key={widget.id}
                className="min-w-0 min-h-0 overflow-hidden rounded-xl"
                style={{
                  gridColumn: `${widget.x + 1} / span ${widget.w}`,
                  gridRow: `${widget.y + 1} / span ${widget.h}`,
                  backgroundColor:
                    widget.type === 'events-list' || widget.type === 'clock'
                      ? `${config.theme.primary}40`
                      : undefined,
                }}
              >
                <WidgetRenderer widget={widget} theme={config.theme} corsProxy={config.corsProxy} />
              </div>
            ))}

            {/* Empty state */}
            {layout.length === 0 && !loading && (
              <div
                className="flex items-center justify-center text-white/30"
                style={{
                  gridColumn: '1 / -1',
                  gridRow: '1 / -1',
                }}
              >
                <div className="text-center">
                  <p className="text-2xl mb-2">No widgets configured</p>
                  <p className="text-lg">Use the configurator to set up your display</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-[#022b21] flex items-center justify-center">
          <div className="text-white/50 text-xl">Loading display...</div>
        </div>
      }
    >
      <DisplayContent />
    </Suspense>
  );
}
