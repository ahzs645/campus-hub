'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { decodeConfig, DEFAULT_CONFIG, normalizeConfig, getBasePath, type DisplayConfig } from '@/lib/config';
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

const resolveUrl = (url: string, basePath: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed, window.location.origin + basePath + '/').toString();
  } catch {
    return trimmed;
  }
};

function DisplayContent() {
  const searchParams = useSearchParams();
  const basePath = getBasePath();
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
        const screenMapUrl = resolveUrl(screenUrlParam || `${basePath}/screens.json`, basePath);
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
        const resolvedUrl = resolveUrl(playlistUrl, basePath);
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
        const resolvedUrl = resolveUrl(configUrl, basePath);
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
  }, [paramsKey, basePath]);

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
        const resolvedUrl = resolveUrl(item.configUrl, basePath);
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
  }, [playlist, currentIndex, basePath]);

  const config: DisplayConfig = activeConfig;

  const gridRows = config.gridRows ?? 8;
  const layout = useMemo(() => {
    if (config.tickerEnabled && !config.layout.some((w) => w.type === 'news-ticker')) {
      return [
        ...config.layout,
        { id: 'default-ticker', type: 'news-ticker', x: 0, y: gridRows - 1, w: 12, h: 1 },
      ];
    }
    return config.layout;
  }, [config, gridRows]);

  return (
    <div
      className="w-full h-screen flex flex-col text-white overflow-hidden relative"
      style={{
        backgroundColor: config.theme.background,
        '--background': config.theme.background,
        '--foreground': '#ffffff',
        '--color-primary': config.theme.primary,
        '--color-accent': config.theme.accent,
      } as React.CSSProperties}
    >
      {config.schoolName && (
        <div
          className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur bg-black/30"
          style={{ color: config.theme.accent, border: `1px solid ${config.theme.accent}40` }}
        >
          {config.schoolName}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-white/70 text-lg">Loading display…</div>
        </div>
      )}

      {/* CSS Grid Layout - 12 columns */}
      <div
        className="flex-1 p-4 gap-4 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
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
