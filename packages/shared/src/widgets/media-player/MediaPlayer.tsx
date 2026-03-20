import { View, Text, StyleSheet, Platform } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface MediaPlayerConfig { url?: string; type?: 'video' | 'audio'; autoplay?: boolean; muted?: boolean; loop?: boolean; }

export default function MediaPlayer({ config, theme }: WidgetComponentProps) {
  const mc = config as MediaPlayerConfig | undefined;
  const url = mc?.url ?? '';
  const mediaType = mc?.type ?? 'video';
  const autoplay = mc?.autoplay ?? false;
  const muted = mc?.muted ?? true;
  const loop = mc?.loop ?? false;

  if (!url) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name={mediaType === 'audio' ? 'music' : 'film'} size={36} color="rgba(255,255,255,0.7)" />
        <Text style={s.emptyText}>No media configured</Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={s.container}>
        {mediaType === 'audio' ? (
          <audio src={url} autoPlay={autoplay} muted={muted} loop={loop} controls style={{ width: '100%' }} />
        ) : (
          <video src={url} autoPlay={autoplay} muted={muted} loop={loop} controls
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} playsInline />
        )}
      </View>
    );
  }

  return (
    <View style={[s.placeholder, { backgroundColor: `${theme.primary}40` }]}>
      <AppIcon name="film" size={48} color="rgba(255,255,255,0.5)" />
      <Text style={s.placeholderText}>Media Player</Text>
      <Text style={s.placeholderHint}>Available on web displays</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 8, backgroundColor: '#000' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 12 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholderText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 12, fontWeight: '600' },
  placeholderHint: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },
});

registerWidget({
  type: 'media-player', name: 'Media Player', description: 'Play video or audio files',
  icon: 'film', minW: 3, minH: 2, defaultW: 6, defaultH: 4, component: MediaPlayer,
  defaultProps: { url: '', type: 'video', autoplay: false, muted: true, loop: false },
});
