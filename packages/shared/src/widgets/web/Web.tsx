import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface WebConfig { url?: string; refreshInterval?: number; }

function WebEmbed({ url, refreshInterval }: { url: string; refreshInterval: number }) {
  const [iframeSrc, setIframeSrc] = useState(url);
  useEffect(() => { setIframeSrc(url); }, [url]);
  useEffect(() => {
    if (!url || refreshInterval <= 0) return;
    const interval = setInterval(() => {
      try {
        const nextUrl = new URL(url, window.location.origin);
        nextUrl.searchParams.set('_ts', Date.now().toString());
        setIframeSrc(nextUrl.toString());
      } catch {
        const sep = url.includes('?') ? '&' : '?';
        setIframeSrc(`${url}${sep}_ts=${Date.now()}`);
      }
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [url, refreshInterval]);

  return (
    <View style={s.webContainer}>
      <iframe src={iframeSrc} style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox="allow-scripts allow-same-origin allow-forms" title="Web content" />
    </View>
  );
}

export default function Web({ config, theme }: WidgetComponentProps) {
  const wc = config as WebConfig | undefined;
  const url = wc?.url ?? '';
  const refreshInterval = wc?.refreshInterval ?? 0;

  if (!url) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name="globe" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={s.emptyText}>No URL configured</Text>
        <Text style={s.emptyHint}>Add a web URL in settings</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return <WebEmbed url={url} refreshInterval={refreshInterval} />;
  }

  return (
    <View style={[s.placeholder, { backgroundColor: `${theme.primary}40` }]}>
      <AppIcon name="globe" size={48} color="rgba(255,255,255,0.5)" />
      <Text style={s.placeholderText}>Web embed</Text>
      <Text style={s.placeholderHint}>Available on web displays only</Text>
    </View>
  );
}

const s = StyleSheet.create({
  webContainer: { flex: 1, overflow: 'hidden', borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 12 },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholderText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 12, fontWeight: '600' },
  placeholderHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});

registerWidget({
  type: 'web',
  name: 'Web Embed',
  description: 'Embed external web content',
  icon: 'globe',
  minW: 3, minH: 2, defaultW: 6, defaultH: 4,
  component: Web,
  defaultProps: { url: '', refreshInterval: 0 },
});
