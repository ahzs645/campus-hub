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
import './cafeteria-menu/CafeteriaMenu';
import './widget-stack/WidgetStack';
import './library-availability/LibraryAvailability';
import './group-fitness/GroupFitness';
import './confessions/Confessions';
import './rich-text/RichText';
import './air-quality/AirQuality';
import './club-spotlight/ClubSpotlight';
import './uv-index/UvIndex';
import './countdown/Countdown';
import './drought-level/DroughtLevel';
import './fire-hazard/FireHazard';
import './groundwater-level/GroundwaterLevel';
import './satellite-view/SatelliteView';
import './aurora-forecast/AuroraForecast';
import './job-board/JobBoard';
import './exchange-rate/ExchangeRate';
import './kaomoji/Kaomoji';
import './holiday-calendar/HolidayCalendar';
import './crypto-tracker/CryptoTracker';
import './iss-tracker/ISSTracker';
import './f1-countdown/F1Countdown';
import './time-progress/TimeProgress';
import './flashcard/Flashcard';
import './bottle-spin/BottleSpin';
import './rock-paper-scissors/RockPaperScissors';
import './nothing-glyph/NothingGlyph';

// Re-export registry functions
export { getWidget, getAllWidgets, getWidgetComponent } from '@/lib/widget-registry';
