'use client';

import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import MediaPlayerOptions from './MediaPlayerOptions';

interface MediaPlayerConfig {
  url?: string;
  type?: 'video' | 'audio';
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export default function MediaPlayer({ config, theme }: WidgetComponentProps) {
  const mediaConfig = config as MediaPlayerConfig | undefined;
  const url = mediaConfig?.url ?? '';
  const type = mediaConfig?.type ?? 'video';
  const autoplay = mediaConfig?.autoplay ?? false;
  const muted = mediaConfig?.muted ?? true;
  const loop = mediaConfig?.loop ?? true;
  const controls = mediaConfig?.controls ?? true;

  if (!url) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-4xl mb-3">{type === 'audio' ? '🎵' : '🎬'}</span>
        <span className="text-white/70 text-sm">No media configured</span>
        <span className="text-white/50 text-xs mt-1">Add a media URL in settings</span>
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <span className="text-5xl mb-4">🎵</span>
        <audio
          src={url}
          autoPlay={autoplay}
          muted={muted}
          loop={loop}
          controls={controls}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-black">
      <video
        src={url}
        autoPlay={autoplay}
        muted={muted}
        loop={loop}
        controls={controls}
        className="w-full h-full object-contain"
        playsInline
      />
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'media-player',
  name: 'Media Player',
  description: 'Play video or audio files',
  icon: '🎬',
  minW: 3,
  minH: 2,
  defaultW: 6,
  defaultH: 4,
  component: MediaPlayer,
  OptionsComponent: MediaPlayerOptions,
  defaultProps: {
    url: '',
    type: 'video',
    autoplay: false,
    muted: true,
    loop: true,
    controls: true,
  },
});
