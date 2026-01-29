// Configuration encoding/decoding utilities for URL-based config

export interface WidgetConfig {
  id: string;
  type: 'clock' | 'poster-carousel' | 'events-list' | 'news-ticker' | 'weather' | 'youtube' | 'web' | 'image' | 'media-player' | 'slideshow';
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
}

export const DEFAULT_CONFIG: DisplayConfig = {
  layout: [
    { id: 'clock-1', type: 'clock', x: 10, y: 0, w: 2, h: 1 },
    { id: 'poster-1', type: 'poster-carousel', x: 0, y: 1, w: 8, h: 5, props: { rotationSeconds: 10 } },
    { id: 'events-1', type: 'events-list', x: 8, y: 1, w: 4, h: 3 },
  ],
  theme: {
    primary: '#035642',
    accent: '#B79527',
    background: '#022b21',
  },
  schoolName: 'Campus Hub',
  tickerEnabled: true,
};

export function encodeConfig(config: DisplayConfig): string {
  try {
    const json = JSON.stringify(config);
    // Use base64url encoding (URL-safe)
    if (typeof window !== 'undefined') {
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return Buffer.from(json).toString('base64url');
  } catch {
    return '';
  }
}

export function decodeConfig(encoded: string): DisplayConfig | null {
  try {
    // Restore base64 padding and characters
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    let json: string;
    if (typeof window !== 'undefined') {
      json = atob(base64);
    } else {
      json = Buffer.from(base64, 'base64').toString('utf-8');
    }

    return JSON.parse(json) as DisplayConfig;
  } catch {
    return null;
  }
}

// Generate a shareable URL with the config
export function generateShareUrl(config: DisplayConfig, baseUrl: string = ''): string {
  const encoded = encodeConfig(config);
  return `${baseUrl}/display?config=${encoded}`;
}
