'use client';

import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import AppIcon from '@/components/AppIcon';
import ImageOptions from './ImageOptions';

interface ImageConfig {
  url?: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export default function ImageWidget({ config, theme }: WidgetComponentProps) {
  const imageConfig = config as ImageConfig | undefined;
  const url = imageConfig?.url ?? '';
  const alt = imageConfig?.alt ?? 'Image';
  const fit = imageConfig?.fit ?? 'cover';

  if (!url) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-6 text-center"
        style={{ backgroundColor: `${theme.primary}40` }}
      >
        <AppIcon name="image" className="w-9 h-9 mb-3 text-white/70" />
        <span className="text-white/70 text-sm">No image configured</span>
        <span className="text-white/50 text-xs mt-1">Add an image URL in settings</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-lg">
      <img
        src={url}
        alt={alt}
        className="w-full h-full"
        style={{ objectFit: fit }}
      />
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'image',
  name: 'Image',
  description: 'Display a static image',
  icon: 'image',
  minW: 2,
  minH: 2,
  defaultW: 4,
  defaultH: 3,
  component: ImageWidget,
  OptionsComponent: ImageOptions,
  defaultProps: {
    url: '',
    alt: 'Image',
    fit: 'cover',
  },
});
