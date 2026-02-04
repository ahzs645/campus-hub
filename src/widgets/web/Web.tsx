'use client';

import { useEffect, useState } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import WebOptions from './WebOptions';

interface WebConfig {
  url?: string;
  refreshInterval?: number;
}

export default function Web({ config, theme }: WidgetComponentProps) {
  const webConfig = config as WebConfig | undefined;
  const url = webConfig?.url ?? '';
  const refreshInterval = webConfig?.refreshInterval ?? 0;
  const [iframeSrc, setIframeSrc] = useState(url);

  useEffect(() => {
    setIframeSrc(url);
  }, [url]);

  useEffect(() => {
    if (!url || refreshInterval <= 0) return;

    const updateSrc = () => {
      try {
        const nextUrl = new URL(url, window.location.origin);
        nextUrl.searchParams.set('_ts', Date.now().toString());
        setIframeSrc(nextUrl.toString());
      } catch {
        const separator = url.includes('?') ? '&' : '?';
        setIframeSrc(`${url}${separator}_ts=${Date.now()}`);
      }
    };

    const interval = setInterval(updateSrc, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [url, refreshInterval]);

  if (!url) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-4xl mb-3">🌐</span>
        <span className="text-white/70 text-sm">No URL configured</span>
        <span className="text-white/50 text-xs mt-1">Add a web URL in settings</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Web content"
      />
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'web',
  name: 'Web Embed',
  description: 'Embed external web content',
  icon: '🌐',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 4,
  component: Web,
  OptionsComponent: WebOptions,
  defaultProps: {
    url: '',
    refreshInterval: 0,
  },
});
