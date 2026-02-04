// Configuration encoding/decoding utilities for URL-based config
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

export interface WidgetConfig {
  id: string;
  type:
    | 'clock'
    | 'poster-carousel'
    | 'events-list'
    | 'news-ticker'
    | 'weather'
    | 'youtube'
    | 'web'
    | 'image'
    | 'media-player'
    | 'slideshow';
  x: number;
  y: number;
  w: number;
  h: number;
  props?: Record<string, unknown>;
}

export interface DisplayConfig {
  layout: WidgetConfig[];
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  schoolName: string;
  tickerEnabled: boolean;
  gridRows?: number;
}

export const DEFAULT_CONFIG: DisplayConfig = {
  layout: [
    { id: 'clock-1', type: 'clock', x: 10, y: 0, w: 2, h: 1 },
    { id: 'poster-1', type: 'poster-carousel', x: 0, y: 1, w: 8, h: 5, props: { rotationSeconds: 10 } },
    { id: 'events-1', type: 'events-list', x: 8, y: 1, w: 4, h: 3 },
    { id: 'news-ticker-1', type: 'news-ticker', x: 0, y: 7, w: 12, h: 1 },
  ],
  theme: {
    primary: '#035642',
    accent: '#B79527',
    background: '#022b21',
  },
  schoolName: 'Campus Hub',
  tickerEnabled: true,
  gridRows: 8,
};

const normalizeBasePath = (basePath: string): string => {
  if (!basePath) return '';
  if (basePath === '/') return '';
  return basePath.startsWith('/') ? basePath : `/${basePath}`;
};

export const getBasePath = (): string =>
  normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? '');

export function normalizeConfig(raw: Partial<DisplayConfig> | null | undefined): DisplayConfig {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const layout = Array.isArray(safe.layout)
    ? safe.layout.map((item, index) => ({
        id: typeof item.id === 'string' ? item.id : `${item.type ?? 'widget'}-${index}`,
        type: (typeof item.type === 'string' ? item.type : 'clock') as WidgetConfig['type'],
        x: Number.isFinite(item.x) ? item.x : 0,
        y: Number.isFinite(item.y) ? item.y : 0,
        w: Number.isFinite(item.w) ? item.w : 1,
        h: Number.isFinite(item.h) ? item.h : 1,
        props:
          item.props && typeof item.props === 'object'
            ? (item.props as Record<string, unknown>)
            : undefined,
      }))
    : DEFAULT_CONFIG.layout;

  return {
    layout,
    theme: { ...DEFAULT_CONFIG.theme, ...(safe.theme ?? {}) },
    schoolName:
      typeof safe.schoolName === 'string' && safe.schoolName.trim().length > 0
        ? safe.schoolName
        : DEFAULT_CONFIG.schoolName,
    tickerEnabled:
      typeof safe.tickerEnabled === 'boolean' ? safe.tickerEnabled : DEFAULT_CONFIG.tickerEnabled,
    gridRows:
      typeof safe.gridRows === 'number' && Number.isFinite(safe.gridRows)
        ? safe.gridRows
        : DEFAULT_CONFIG.gridRows,
  };
}

const decodeBase64Url = (encoded: string): string | null => {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }
    if (typeof atob !== 'undefined') {
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
    return null;
  } catch {
    return null;
  }
};

export function encodeConfig(config: DisplayConfig): string {
  try {
    const json = JSON.stringify(config);
    return compressToEncodedURIComponent(json);
  } catch {
    return '';
  }
}

export function decodeConfig(encoded: string): DisplayConfig | null {
  try {
    const decompressed = decompressFromEncodedURIComponent(encoded);
    const json = decompressed || decodeBase64Url(encoded);
    if (!json) return null;
    return normalizeConfig(JSON.parse(json) as DisplayConfig);
  } catch {
    return null;
  }
}

// Generate a shareable URL with the config
export function generateShareUrl(config: DisplayConfig, origin: string): string {
  const encoded = encodeConfig(config);
  const basePath = getBasePath();
  return `${origin}${basePath}/display?config=${encoded}`;
}
