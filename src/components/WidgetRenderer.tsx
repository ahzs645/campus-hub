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
}

export default function WidgetRenderer({ widget, theme }: WidgetRendererProps) {
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
    <div className="h-full w-full">
      <Component config={widget.props} theme={theme} />
    </div>
  );
}
