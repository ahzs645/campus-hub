'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  decodeConfig,
  DEFAULT_CONFIG,
  normalizeConfig,
  type DisplayConfig,
  type WidgetConfig,
} from '@/lib/config';
import { buildCacheKey, fetchJsonWithCache } from '@/lib/data-cache';
import WidgetRenderer from '@/components/WidgetRenderer';
import '@/widgets'; // Register all widgets

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

const resolveUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, window.location.origin + '/').toString();
  } catch {
    return trimmed;
  }
};

function DisplayContent() {
  const searchParams = useSearchParams();
  const paramsKey = searchParams.toString();

  const [activeConfig, setActiveConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
          const decoded = decodeConfig(configParam);
          if (decoded) resolvedConfig = decoded;
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

  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Scale to fit: pick the smaller ratio so nothing overflows
    setScale(Math.min(vw / REF_WIDTH, vh / REF_HEIGHT));
  }, [REF_WIDTH]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // Grid margin matches the editor formula: height * 0.0075
  const gridMargin = Math.max(2, Math.round(REF_HEIGHT * 0.0075));

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: config.theme.background }}
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
                <WidgetRenderer widget={widget} theme={config.theme} />
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
