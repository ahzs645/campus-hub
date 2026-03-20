import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import AppIcon from '../../components/AppIcon';

interface RichTextConfig {
  content?: string;
  fontSize?: number;
  scrollSpeed?: number;
  autoScroll?: boolean;
}

/** Strip HTML tags for native plain-text rendering */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/** Web renderer using dangerouslySetInnerHTML via a wrapper div */
function WebRichText({
  content,
  fontSize,
  autoScroll,
  scrollSpeed,
  height,
}: {
  content: string;
  fontSize: number;
  autoScroll: boolean;
  scrollSpeed: number;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    const el = containerRef.current;
    let animationId: number;
    let offset = 0;
    const speed = scrollSpeed / 60; // pixels per frame

    const step = () => {
      offset += speed;
      if (offset >= el.scrollHeight - el.clientHeight) {
        offset = 0;
      }
      el.scrollTop = offset;
      animationId = requestAnimationFrame(step);
    };
    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [autoScroll, scrollSpeed, content]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        color: 'white',
        fontSize,
        lineHeight: 1.6,
        maxHeight: height,
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

/** Native renderer with auto-scroll via Animated */
function NativeRichText({
  content,
  fontSize,
  autoScroll,
  scrollSpeed,
}: {
  content: string;
  fontSize: number;
  autoScroll: boolean;
  scrollSpeed: number;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const plainText = stripHtml(content);

  useEffect(() => {
    if (!autoScroll) return;
    const animation = Animated.loop(
      Animated.timing(scrollY, {
        toValue: -500,
        duration: (500 / Math.max(scrollSpeed, 1)) * 1000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [autoScroll, scrollSpeed, scrollY]);

  return (
    <View style={st.nativeContent}>
      <Animated.View style={autoScroll ? { transform: [{ translateY: scrollY }] } : undefined}>
        <Text style={[st.nativeText, { fontSize }]}>{plainText}</Text>
      </Animated.View>
    </View>
  );
}

export default function RichText({
  config,
  theme,
  width,
  height,
}: WidgetComponentProps) {
  const rc = config as RichTextConfig | undefined;
  const content = rc?.content ?? '';
  const fontSize = rc?.fontSize ?? 16;
  const scrollSpeed = rc?.scrollSpeed ?? 30;
  const autoScroll = rc?.autoScroll ?? false;

  if (!content) {
    return (
      <View style={[st.empty, { backgroundColor: `${theme.primary}40` }]}>
        <AppIcon name="newspaper" size={36} color="rgba(255,255,255,0.7)" />
        <Text style={st.emptyText}>No content configured</Text>
        <Text style={st.emptyHint}>Add rich text content in settings</Text>
      </View>
    );
  }

  return (
    <View style={[st.container, { backgroundColor: `${theme.primary}20`, width, height }]}>
      {Platform.OS === 'web' ? (
        <WebRichText
          content={content}
          fontSize={fontSize}
          autoScroll={autoScroll}
          scrollSpeed={scrollSpeed}
          height={height}
        />
      ) : (
        <NativeRichText
          content={content}
          fontSize={fontSize}
          autoScroll={autoScroll}
          scrollSpeed={scrollSpeed}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 12,
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
  nativeContent: {
    flex: 1,
    padding: 16,
    overflow: 'hidden',
  },
  nativeText: {
    color: 'white',
    lineHeight: 26,
  },
});

registerWidget({
  type: 'rich-text',
  name: 'Rich Text',
  description: 'Display formatted rich text or HTML content',
  icon: 'newspaper',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: RichText,
  defaultProps: {
    content: '',
    fontSize: 16,
    scrollSpeed: 30,
    autoScroll: false,
  },
});
