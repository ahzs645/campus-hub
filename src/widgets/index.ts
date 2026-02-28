// Widget Registry Index - Import all widgets to register them

// Import widgets to trigger registration
import './clock/Clock';
import './poster-carousel/PosterCarousel';
import './events-list/EventsList';
import './news-ticker/NewsTicker';
import './weather/Weather';
import './youtube/YouTube';
import './web/Web';
import './image/Image';
import './media-player/MediaPlayer';
import './slideshow/Slideshow';
import './poster-feed/PosterFeed';
import './bus-connection/BusConnection';
import './qrcode/QRCode';
import './climbing-gym/ClimbingGym';
import './widget-stack/WidgetStack';
import './cafeteria-menu/CafeteriaMenu';
import './air-quality/AirQuality';

// Re-export registry functions
export { getWidget, getAllWidgets, getWidgetComponent } from '@/lib/widget-registry';
