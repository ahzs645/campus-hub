// @campus-hub/shared - Cross-platform widget library
// Widgets register themselves when imported

// Types
export type {
  WidgetConfig,
  DisplayConfig,
  ThemeColors,
  WidgetComponentProps,
  WidgetOptionsProps,
  LogoConfig,
} from './lib/types';
export { DEFAULT_CONFIG } from './lib/types';

// Registry
export {
  registerWidget,
  getWidget,
  getAllWidgets,
  getWidgetComponent,
} from './lib/widget-registry';
export type { WidgetDefinition } from './lib/widget-registry';

// Data cache
export {
  buildCacheKey,
  buildProxyUrl,
  fetchTextWithCache,
  fetchJsonWithCache,
  isEntryFresh,
} from './lib/data-cache';

// Hooks
export { useFitScale, useAdaptiveFitScale } from './hooks/useFitScale';
export { useEvents, formatDate, formatTime } from './hooks/useEvents';
export type { CalendarEvent, UseEventsOptions } from './hooks/useEvents';

// Components
export { default as AppIcon } from './components/AppIcon';
export type { IconName } from './components/AppIcon';
export { default as DisplayGrid } from './components/DisplayGrid';

// Widget registrations - import to trigger self-registration
import './widgets';
