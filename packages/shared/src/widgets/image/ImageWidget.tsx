import { View, Text, Image, StyleSheet, type ImageResizeMode } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface ImageConfig { url?: string; alt?: string; fit?: 'cover' | 'contain' | 'fill'; }

const FIT_MAP: Record<string, ImageResizeMode> = { cover: 'cover', contain: 'contain', fill: 'stretch' };

export default function ImageWidget({ config, theme }: WidgetComponentProps) {
  const ic = config as ImageConfig | undefined;
  const url = ic?.url ?? '';
  const fit: ImageResizeMode = FIT_MAP[ic?.fit ?? 'cover'] ?? 'cover';

  if (!url) {
    return (
      <View style={[s.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name="image" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={s.emptyText}>No image configured</Text>
        <Text style={s.emptyHint}>Add an image URL in settings</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode={fit} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 12 },
  emptyHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
});

registerWidget({
  type: 'image',
  name: 'Image',
  description: 'Display an image from a URL',
  icon: 'image',
  minW: 2, minH: 2, defaultW: 4, defaultH: 3,
  component: ImageWidget,
  defaultProps: { url: '', fit: 'cover' },
});
