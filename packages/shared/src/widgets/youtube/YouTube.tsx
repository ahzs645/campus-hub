import { View, Text, StyleSheet, Platform } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface YouTubeConfig { videoId?: string; autoplay?: boolean; muted?: boolean; loop?: boolean; }

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; }
  return null;
}

function YouTubeWeb({ videoId, autoplay, muted, loop }: { videoId: string; autoplay: boolean; muted: boolean; loop: boolean }) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0', mute: muted ? '1' : '0',
    loop: loop ? '1' : '0', playlist: videoId, controls: '1', modestbranding: '1', rel: '0',
  });
  // On web, react-native-web allows rendering DOM elements
  // We use a View wrapper with the iframe rendered inside
  return (
    <View style={StyleSheet.absoluteFill}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        style={{ width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </View>
  );
}

function YouTubeNative({ theme }: { theme: { primary: string } }) {
  return (
    <View style={[s.placeholder, { backgroundColor: `${theme.primary}40` }]}>
      <AppIcon name="tv" size={48} color="rgba(255,255,255,0.5)" />
      <Text style={s.placeholderText}>YouTube playback</Text>
      <Text style={s.placeholderHint}>Video plays on web displays</Text>
    </View>
  );
}

export default function YouTube({ config, theme }: WidgetComponentProps) {
  const yc = config as YouTubeConfig | undefined;
  const videoId = yc?.videoId ? extractVideoId(yc.videoId) : null;
  const autoplay = yc?.autoplay ?? false;
  const muted = yc?.muted ?? true;
  const loop = yc?.loop ?? true;

  if (!videoId) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name="tv" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={s.emptyText}>No video configured</Text>
        <Text style={s.emptyHint}>Add a YouTube URL in settings</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return <YouTubeWeb videoId={videoId} autoplay={autoplay} muted={muted} loop={loop} />;
  }

  return <YouTubeNative theme={theme} />;
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 12 },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholderText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 12, fontWeight: '600' },
  placeholderHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});

registerWidget({
  type: 'youtube',
  name: 'YouTube',
  description: 'Embed YouTube videos',
  icon: 'tv',
  minW: 3, minH: 2, defaultW: 6, defaultH: 4,
  component: YouTube,
  defaultProps: { videoId: '', autoplay: false, muted: true, loop: true },
});
