'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { decodeConfig, DEFAULT_CONFIG, type DisplayConfig } from '@/lib/config';
import WidgetRenderer from '@/components/WidgetRenderer';
import '@/widgets'; // Register all widgets

function DisplayContent() {
  const searchParams = useSearchParams();
  const configParam = searchParams.get('config');

  const config: DisplayConfig = useMemo(() => {
    if (configParam) {
      const decoded = decodeConfig(configParam);
      if (decoded) return decoded;
    }
    return DEFAULT_CONFIG;
  }, [configParam]);

  const gridRows = 8;
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
      className="w-full h-screen flex flex-col text-white overflow-hidden"
      style={{
        backgroundColor: config.theme.background,
        '--background': config.theme.background,
        '--foreground': '#ffffff',
        '--color-primary': config.theme.primary,
        '--color-accent': config.theme.accent,
      } as React.CSSProperties}
    >
      {/* CSS Grid Layout - 12 columns, 7-8 rows */}
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
        {layout.length === 0 && (
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
