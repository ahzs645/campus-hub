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

// Re-export registry functions
export { getWidget, getAllWidgets, getWidgetComponent } from '@/lib/widget-registry';
