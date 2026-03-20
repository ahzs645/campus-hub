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
  'group-fitness': () => import('@/widgets/group-fitness/GroupFitness'),
  confessions: () => import('@/widgets/confessions/Confessions'),
  'cafeteria-menu': () => import('@/widgets/cafeteria-menu/CafeteriaMenu'),
  'rich-text': () => import('@/widgets/rich-text/RichText'),
  'air-quality': () => import('@/widgets/air-quality/AirQuality'),
  'club-spotlight': () => import('@/widgets/club-spotlight/ClubSpotlight'),
  'uv-index': () => import('@/widgets/uv-index/UvIndex'),
  countdown: () => import('@/widgets/countdown/Countdown'),
  'fire-hazard': () => import('@/widgets/fire-hazard/FireHazard'),
  'drought-level': () => import('@/widgets/drought-level/DroughtLevel'),
  'groundwater-level': () => import('@/widgets/groundwater-level/GroundwaterLevel'),
  'satellite-view': () => import('@/widgets/satellite-view/SatelliteView'),
  'aurora-forecast': () => import('@/widgets/aurora-forecast/AuroraForecast'),
  'job-board': () => import('@/widgets/job-board/JobBoard'),
  'exchange-rate': () => import('@/widgets/exchange-rate/ExchangeRate'),
  kaomoji: () => import('@/widgets/kaomoji/Kaomoji'),
  'holiday-calendar': () => import('@/widgets/holiday-calendar/HolidayCalendar'),
  'crypto-tracker': () => import('@/widgets/crypto-tracker/CryptoTracker'),
  'iss-tracker': () => import('@/widgets/iss-tracker/ISSTracker'),
  'f1-countdown': () => import('@/widgets/f1-countdown/F1Countdown'),
  'time-progress': () => import('@/widgets/time-progress/TimeProgress'),
  flashcard: () => import('@/widgets/flashcard/Flashcard'),
  'bottle-spin': () => import('@/widgets/bottle-spin/BottleSpin'),
  'rock-paper-scissors': () => import('@/widgets/rock-paper-scissors/RockPaperScissors'),
};

export const DISPLAY_WIDGET_COMPONENTS: Record<string, DisplayWidgetComponent> = Object.fromEntries(
  Object.entries(DISPLAY_WIDGET_LOADERS).map(([type, loader]) => [type, createDisplayWidget(loader)]),
);

export function preloadDisplayWidgetComponent(type: string): void {
  const loader = DISPLAY_WIDGET_LOADERS[type];
  if (!loader) return;
  void loader();
}
