'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  decodeConfig,
  normalizeConfig,
} from '@/lib/config';
import { DEFAULT_CONFIG, type DisplayConfig, buildCacheKey, fetchJsonWithCache, DisplayGrid } from '@campus-hub/shared';

// Import shared widgets to trigger registration
import '@campus-hub/shared';

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

const parseConfigJsonParam = (value: string): DisplayConfig | null => {
  const candidates = [value];
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) candidates.push(decoded);
  } catch {}
  for (const candidate of candidates) {
    try { return (normalizeConfig as any)(JSON.parse(candidate) as DisplayConfig); } catch {}
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
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });

  // Measure viewport
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const vw = vv ? vv.width * vv.scale : window.innerWidth;
      const vh = vv ? vv.height * vv.scale : window.innerHeight;
      setDimensions({ width: vw, height: vh });
    };
    update();
    const vv = window.visualViewport;
    const target = vv ?? window;
    target.addEventListener('resize', update);
    return () => target.removeEventListener('resize', update);
  }, []);

  // Resolve config from URL params
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
            cacheKey: buildCacheKey('screen-map', screenMapUrl), ttlMs: 5 * 60 * 1000,
          });
          const screenEntry = data?.screens?.[screenId];
          if (screenEntry?.playlistUrl) playlistUrl = screenEntry.playlistUrl;
          if (screenEntry?.configUrl) configUrl = screenEntry.configUrl;
        } catch (error) { console.error('Failed to load screen map:', error); }
      }

      if (playlistUrl) {
        const resolvedUrl = resolveUrl(playlistUrl);
        try {
          const { data } = await fetchJsonWithCache<Playlist>(resolvedUrl, {
            cacheKey: buildCacheKey('playlist', resolvedUrl), ttlMs: 5 * 60 * 1000,
          });
          if (data?.items?.length) resolvedPlaylist = data;
        } catch (error) { console.error('Failed to load playlist:', error); }
      }

      if (!resolvedPlaylist && configUrl) {
        const resolvedUrl = resolveUrl(configUrl);
        try {
          const { data } = await fetchJsonWithCache<DisplayConfig>(resolvedUrl, {
            cacheKey: buildCacheKey('config', resolvedUrl), ttlMs: 5 * 60 * 1000,
          });
          resolvedConfig = (normalizeConfig as any)(data);
        } catch (error) { console.error('Failed to load config URL:', error); }
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
        if (configJsonParam) resolvedConfig = parseConfigJsonParam(configJsonParam);
      }

      if (!resolvedPlaylist && !resolvedConfig) resolvedConfig = DEFAULT_CONFIG;

      if (!isMounted) return;
      setPlaylist(resolvedPlaylist);
      setCurrentIndex(0);
      setActiveConfig(resolvedConfig ?? DEFAULT_CONFIG);
      setLoading(false);
    };
    resolveConfig();
    return () => { isMounted = false; };
  }, [paramsKey]);

  // Playlist rotation
  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;
    let isMounted = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const loadPlaylistItem = async () => {
      const item = playlist.items[currentIndex];
      if (!item) return;
      if (item.config) {
        setActiveConfig((normalizeConfig as any)(item.config));
      } else if (item.configUrl) {
        const resolvedUrl = resolveUrl(item.configUrl);
        try {
          const { data } = await fetchJsonWithCache<DisplayConfig>(resolvedUrl, {
            cacheKey: buildCacheKey('playlist-config', resolvedUrl), ttlMs: 5 * 60 * 1000,
          });
          if (isMounted) setActiveConfig((normalizeConfig as any)(data));
        } catch (error) { console.error('Failed to load playlist config:', error); }
      }
      const duration = Math.max(5, item.durationSeconds ?? 30);
      const isLast = currentIndex >= playlist.items.length - 1;
      const shouldLoop = playlist.loop !== false;
      if (shouldLoop || !isLast) {
        timeout = setTimeout(() => {
          setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= playlist.items.length) return shouldLoop ? 0 : prev;
            return next;
          });
        }, duration * 1000);
      }
    };
    loadPlaylistItem();
    return () => { isMounted = false; if (timeout) clearTimeout(timeout); };
  }, [playlist, currentIndex]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: activeConfig.theme.background,
        touchAction: 'none',
      }}
    >
      {loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18 }}>Loading display…</span>
        </div>
      )}

      {activeConfig.comingSoon && !loading && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <span style={{
            fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase',
            color: activeConfig.theme.accent, backgroundColor: `${activeConfig.theme.primary}80`,
            padding: '16px 32px', borderRadius: 16,
          }}>
            Coming Soon
          </span>
        </div>
      )}

      <DisplayGrid
        config={activeConfig}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}

export default function DisplayPage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#022b21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }}>Loading display...</span>
        </div>
      }
    >
      <DisplayContent />
    </Suspense>
  );
}
