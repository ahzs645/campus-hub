// Shared types matching the web app's config schema

export interface WidgetConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props?: Record<string, unknown>;
  comingSoon?: boolean;
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
  comingSoon?: boolean;
  gridRows?: number;
  gridCols?: number;
  aspectRatio?: number;
  corsProxy?: string;
}

export interface WidgetComponentProps {
  config?: Record<string, unknown>;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  corsProxy?: string;
  width: number;
  height: number;
}

export const DEFAULT_CONFIG: DisplayConfig = {
  layout: [
    { id: 'clock-1', type: 'clock', x: 10, y: 0, w: 2, h: 1 },
    {
      id: 'poster-1',
      type: 'poster-carousel',
      x: 0,
      y: 1,
      w: 8,
      h: 5,
      props: { rotationSeconds: 10 },
    },
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
  corsProxy: '',
};
