'use client';

import { getWidgetComponent } from '@/widgets';
import type { WidgetConfig } from '@/lib/config';

interface WidgetRendererProps {
  widget: WidgetConfig;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  corsProxy?: string;
}

export default function WidgetRenderer({ widget, theme, corsProxy }: WidgetRendererProps) {
  const Component = getWidgetComponent(widget.type);

  if (!Component) {
    return (
      <div
        className="h-full rounded-2xl flex items-center justify-center border-2 border-dashed"
        style={{ borderColor: `${theme.accent}40`, backgroundColor: `${theme.primary}20` }}
      >
        <span className="text-white/50 text-sm">Unknown widget: {widget.type}</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <div className={widget.comingSoon ? 'h-full w-full blur-sm grayscale pointer-events-none select-none' : 'h-full w-full'}>
        <Component config={widget.props} theme={theme} corsProxy={corsProxy} />
      </div>
      {widget.comingSoon && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
          <span
            className="text-lg font-bold tracking-wide uppercase px-4 py-2 rounded-lg backdrop-blur-sm"
            style={{ color: theme.accent, backgroundColor: `${theme.primary}80` }}
          >
            Coming Soon
          </span>
        </div>
      )}
    </div>
  );
}
