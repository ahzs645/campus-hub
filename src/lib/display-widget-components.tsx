'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import type { WidgetComponentProps } from '@/lib/widget-registry';

type DisplayWidgetComponent = ComponentType<WidgetComponentProps>;
type DisplayWidgetLoader = () => Promise<{ default: DisplayWidgetComponent }>;

function WidgetLoadingFallback() {
  return <div className="h-full w-full" />;
}

const createDisplayWidget = (loader: DisplayWidgetLoader): DisplayWidgetComponent =>
  dynamic(loader, {
    loading: () => <WidgetLoadingFallback />,
  });

const DISPLAY_WIDGET_LOADERS: Record<string, DisplayWidgetLoader> = {
  clock: () => import('@/widgets/clock/Clock'),
  'poster-carousel': () => import('@/widgets/poster-carousel/PosterCarousel'),
  'events-list': () => import('@/widgets/events-list/EventsList'),
  'news-ticker': () => import('@/widgets/news-ticker/NewsTicker'),
  weather: () => import('@/widgets/weather/Weather'),
  youtube: () => import('@/widgets/youtube/YouTube'),
  web: () => import('@/widgets/web/Web'),
  image: () => import('@/widgets/image/Image'),
  'media-player': () => import('@/widgets/media-player/MediaPlayer'),
  slideshow: () => import('@/widgets/slideshow/Slideshow'),
  'poster-feed': () => import('@/widgets/poster-feed/PosterFeed'),
  'widget-stack': () => import('@/widgets/widget-stack/WidgetStack'),
  'bus-connection': () => import('@/widgets/bus-connection/BusConnection'),
  'climbing-gym': () => import('@/widgets/climbing-gym/ClimbingGym'),
  qrcode: () => import('@/widgets/qrcode/QRCode'),
  'library-availability': () => import('@/widgets/library-availability/LibraryAvailability'),
  confessions: () => import('@/widgets/confessions/Confessions'),
  'cafeteria-menu': () => import('@/widgets/cafeteria-menu/CafeteriaMenu'),
};

export const DISPLAY_WIDGET_COMPONENTS: Record<string, DisplayWidgetComponent> = Object.fromEntries(
  Object.entries(DISPLAY_WIDGET_LOADERS).map(([type, loader]) => [type, createDisplayWidget(loader)]),
);

export function preloadDisplayWidgetComponent(type: string): void {
  const loader = DISPLAY_WIDGET_LOADERS[type];
  if (!loader) return;
  void loader();
}
