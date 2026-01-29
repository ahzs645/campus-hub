'use client';

import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import YouTubeOptions from './YouTubeOptions';

interface YouTubeConfig {
  videoId?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function YouTube({ config, theme }: WidgetComponentProps) {
  const youtubeConfig = config as YouTubeConfig | undefined;
  const videoId = youtubeConfig?.videoId ? extractVideoId(youtubeConfig.videoId) : null;
  const autoplay = youtubeConfig?.autoplay ?? false;
  const muted = youtubeConfig?.muted ?? true;
  const loop = youtubeConfig?.loop ?? true;

  if (!videoId) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-4xl mb-3">📺</span>
        <span className="text-white/70 text-sm">No video configured</span>
        <span className="text-white/50 text-xs mt-1">Add a YouTube URL in settings</span>
      </div>
    );
  }

  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: muted ? '1' : '0',
    loop: loop ? '1' : '0',
    playlist: videoId, // Required for loop to work
    controls: '1',
    modestbranding: '1',
    rel: '0',
  });

  return (
    <div className="h-full w-full">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'youtube',
  name: 'YouTube',
  description: 'Embed YouTube videos',
  icon: '📺',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 4,
  component: YouTube,
  OptionsComponent: YouTubeOptions,
  defaultProps: {
    videoId: '',
    autoplay: false,
    muted: true,
    loop: true,
  },
});
