---
title: Widget Registry
description: How the widget registration system works.
draft: false
---

The widget registry is the central hub that connects widget type strings (like `"clock"` or `"weather"`) to their React components and metadata. It uses a simple registration pattern — each widget registers itself when its module is imported.

## How it works

### Registration

Each widget file calls `registerWidget()` at the module level:

```typescript
// src/widgets/clock/Clock.tsx
import { registerWidget } from '@/lib/widget-registry';

function Clock({ config, theme }) {
  // ...component code
}

registerWidget({
  type: 'clock',
  name: 'Clock',
  description: 'Digital clock with date display',
  icon: 'clock',
  minW: 2,
  minH: 1,
  defaultW: 3,
  defaultH: 1,
  component: Clock,
  OptionsComponent: ClockOptions,
  defaultProps: { showSeconds: true, showDate: true },
});
```

### Barrel import

All widgets are imported through `src/widgets/index.ts`:

```typescript
import './clock/Clock';
import './poster-carousel/PosterCarousel';
import './events-list/EventsList';
// ...every widget
```

This file is imported early in the application lifecycle, ensuring all widgets are registered before any rendering occurs.

### Lookup

When the display page needs to render a widget, it looks up the component by type:

```typescript
import { getWidgetComponent } from '@/widgets';

const Component = getWidgetComponent('clock');
// Returns the Clock React component, or null if not found
```

## Registry API

The registry (`src/lib/widget-registry.ts`) exposes four functions:

### `registerWidget(definition)`

Adds a widget to the registry. Called once per widget at import time.

### `getWidget(type): WidgetDefinition | undefined`

Returns the full definition for a widget type, including metadata and components.

### `getAllWidgets(): WidgetDefinition[]`

Returns all registered widgets. Used by the configurator's widget library to display available widgets.

### `getWidgetComponent(type): ComponentType | null`

Shortcut that returns just the React component for rendering.

## WidgetDefinition interface

```typescript
interface WidgetDefinition {
  type: string;                          // Unique identifier
  name: string;                          // Human-readable name
  description: string;                   // Short description for the library
  icon: IconName;                        // Lucide icon name
  minW: number;                          // Minimum grid columns
  minH: number;                          // Minimum grid rows
  maxW?: number;                         // Maximum grid columns
  maxH?: number;                         // Maximum grid rows
  defaultW: number;                      // Default width when added
  defaultH: number;                      // Default height when added
  component: ComponentType<WidgetComponentProps>;
  OptionsComponent?: ComponentType<WidgetOptionsProps>;
  defaultProps?: Record<string, unknown>;
}
```

## Component props

### Display component

Every widget component receives:

```typescript
interface WidgetComponentProps {
  config?: Record<string, unknown>;  // Widget-specific settings
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
  corsProxy?: string;                // Global CORS proxy URL
}
```

- `config` contains the widget's saved options (set via the options panel).
- `theme` provides the display's color scheme so widgets can match.
- `corsProxy` is the global proxy URL for external data fetching.

### Options component

```typescript
interface WidgetOptionsProps {
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
}
```

- `data` is the current widget options.
- `onChange` replaces the entire options object with the new value.

## Storage

The registry is a simple in-memory `Map<string, WidgetDefinition>`. There is no persistence — registration happens fresh on every page load when the widget modules are imported.

```typescript
const registry: Map<string, WidgetDefinition> = new Map();
```

This is intentional. The registry is populated at import time and remains stable for the application's lifetime.
