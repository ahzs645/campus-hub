import type { ComponentProps } from 'react';
import {
  BusFront,
  CalendarDays,
  Clock3,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Film,
  GalleryHorizontalEnd,
  Gauge,
  Globe,
  Image,
  Link2,
  Megaphone,
  Music2,
  Newspaper,
  Palette,
  Puzzle,
  School,
  Snowflake,
  Sparkles,
  Sun,
  TriangleAlert,
  Tv,
  Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from '@/lib/icon-names';

interface AppIconProps {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  title?: string;
}

const ICONS: Record<IconName, LucideIcon> = {
  bus: BusFront,
  calendar: CalendarDays,
  carousel: GalleryHorizontalEnd,
  clock: Clock3,
  cloud: Cloud,
  cloudFog: CloudFog,
  cloudLightning: CloudLightning,
  cloudRain: CloudRain,
  cloudSun: CloudSun,
  droplets: Droplets,
  film: Film,
  gauge: Gauge,
  globe: Globe,
  image: Image,
  link: Link2,
  megaphone: Megaphone,
  music: Music2,
  newspaper: Newspaper,
  palette: Palette,
  puzzle: Puzzle,
  school: School,
  slideshow: GalleryHorizontalEnd,
  snowflake: Snowflake,
  sparkles: Sparkles,
  sun: Sun,
  tv: Tv,
  warning: TriangleAlert,
  weather: CloudSun,
  wind: Wind,
};

export default function AppIcon({
  name,
  className,
  strokeWidth = 1.8,
  title,
}: AppIconProps) {
  const IconComponent = ICONS[name];
  const accessibilityProps: Pick<ComponentProps<'svg'>, 'aria-hidden' | 'aria-label'> = title
    ? { 'aria-label': title }
    : { 'aria-hidden': true };

  return (
    <IconComponent
      className={className}
      strokeWidth={strokeWidth}
      {...accessibilityProps}
    />
  );
}
