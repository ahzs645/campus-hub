// Cross-platform icon component using lucide-react-native
// On web, react-native-svg-web renders these as standard SVG
// On tvOS, react-native-svg renders them natively
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
  ImageIcon,
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
} from 'lucide-react-native';
import type { ComponentType } from 'react';

export type IconName =
  | 'bus' | 'calendar' | 'carousel' | 'clock' | 'cloud'
  | 'cloudFog' | 'cloudLightning' | 'cloudRain' | 'cloudSun'
  | 'droplets' | 'film' | 'flame' | 'gauge' | 'globe'
  | 'image' | 'layers' | 'link' | 'megaphone' | 'mountain'
  | 'music' | 'newspaper' | 'palette' | 'puzzle' | 'qrCode'
  | 'school' | 'slideshow' | 'snowflake' | 'sparkles' | 'sun'
  | 'tv' | 'utensils' | 'warning' | 'weather' | 'wind'
  | 'users' | 'hourglass' | 'cloudOff' | 'arrowLeftRight'
  | 'smile' | 'partyPopper' | 'coins' | 'satellite' | 'flag'
  | 'languages' | 'hand' | 'wine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LucideIcon = ComponentType<any>;

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
  image: ImageIcon,
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
};

interface AppIconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function AppIcon({
  name,
  size = 24,
  color = 'white',
  strokeWidth = 1.8,
}: AppIconProps) {
  const IconComponent = ICONS[name];
  if (!IconComponent) return null;

  return (
    <IconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}
