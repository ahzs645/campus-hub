import type { ComponentProps } from 'react';
import {
  BusFront,
  CalendarDays,
  Clock3,
  Cloud,
  CloudFog,
  CloudOff,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Film,
  Flame,
  GalleryHorizontalEnd,
  Gauge,
  Globe,
  Image,
  Layers,
  Link2,
  Megaphone,
  Mountain,
  Music2,
  Newspaper,
  Palette,
  Puzzle,
  QrCode,
  School,
  Snowflake,
  Sparkles,
  Sun,
  TriangleAlert,
  Tv,
  UtensilsCrossed,
  Wind,
  Users,
  Hourglass,
  ArrowLeftRight,
  Smile,
  PartyPopper,
  Coins,
  Satellite,
  Flag,
  Languages,
  Hand,
  Wine,
  Rss,
  Table,
  Type,
  CalendarRange,
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
  flame: Flame,
  gauge: Gauge,
  globe: Globe,
  image: Image,
  layers: Layers,
  link: Link2,
  megaphone: Megaphone,
  mountain: Mountain,
  music: Music2,
  newspaper: Newspaper,
  palette: Palette,
  puzzle: Puzzle,
  qrCode: QrCode,
  school: School,
  slideshow: GalleryHorizontalEnd,
  snowflake: Snowflake,
  sparkles: Sparkles,
  sun: Sun,
  tv: Tv,
  utensils: UtensilsCrossed,
  warning: TriangleAlert,
  weather: CloudSun,
  wind: Wind,
  users: Users,
  hourglass: Hourglass,
  cloudOff: CloudOff,
  arrowLeftRight: ArrowLeftRight,
  smile: Smile,
  partyPopper: PartyPopper,
  coins: Coins,
  satellite: Satellite,
  flag: Flag,
  languages: Languages,
  hand: Hand,
  wine: Wine,
  rss: Rss,
  table: Table,
  type: Type,
  calendarRange: CalendarRange,
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
