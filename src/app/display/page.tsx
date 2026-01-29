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

  // Filter out ticker from grid layout (it has its own fixed position)
  const gridWidgets = config.layout.filter((w) => w.type !== 'news-ticker');
  const tickerWidget = config.layout.find((w) => w.type === 'news-ticker');

  // Calculate grid rows based on ticker
  const gridRows = config.tickerEnabled ? 7 : 8;

  return (
    <div
      className="w-full h-screen flex flex-col text-white overflow-hidden"
      style={{
        backgroundColor: config.theme.background,
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
        {gridWidgets.map((widget) => (
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
        {gridWidgets.length === 0 && (
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

      {/* Fixed Ticker at Bottom */}
      {config.tickerEnabled && (
        <div className="flex-shrink-0">
          {tickerWidget ? (
            <WidgetRenderer widget={tickerWidget} theme={config.theme} />
          ) : (
            <WidgetRenderer
              widget={{
                id: 'default-ticker',
                type: 'news-ticker',
                x: 0,
                y: 0,
                w: 12,
                h: 1,
              }}
              theme={config.theme}
            />
          )}
        </div>
      )}
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
