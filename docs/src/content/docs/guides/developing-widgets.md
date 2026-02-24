---
title: Developing Widgets
description: How to create custom widgets for Campus Hub.
draft: false
---

Widgets are self-contained React components that register themselves into a central registry. Each widget lives in its own directory under `src/widgets/` and consists of two files: a **component** and an optional **options panel**.

## Directory structure

```
src/widgets/
  my-widget/
    MyWidget.tsx          # The display component
    MyWidgetOptions.tsx   # Options panel for the configurator (optional)
```

## Step 1 — Create the widget component

Every widget component receives three props:

```typescript
interface WidgetComponentProps {
  config?: Record<string, unknown>;   // Widget-specific settings
  theme: {
    primary: string;    // e.g. "#035642"
    accent: string;     // e.g. "#B79527"
    background: string; // e.g. "#022b21"
  };
  corsProxy?: string;   // Global CORS proxy URL (if configured)
}
```

Create `src/widgets/my-widget/MyWidget.tsx`:

```tsx
'use client';

import { registerWidget } from '@/lib/widget-registry';

interface MyWidgetConfig {
  label?: string;
  refreshSeconds?: number;
}

function MyWidget({ config, theme }: {
  config?: Record<string, unknown>;
  theme: { primary: string; accent: string; background: string };
}) {
  const { label = 'Hello', refreshSeconds = 30 } = (config ?? {}) as MyWidgetConfig;

  return (
    <div
      className="h-full w-full flex items-center justify-center rounded-xl p-4"
      style={{ backgroundColor: `${theme.primary}60`, color: theme.accent }}
    >
      <span className="text-2xl font-bold">{label}</span>
    </div>
  );
}

// Register immediately on import
registerWidget({
  type: 'my-widget',
  name: 'My Widget',
  description: 'A custom widget example',
  icon: 'sparkles',       // Lucide icon name (see src/lib/icon-names.ts)
  minW: 2,                // Minimum grid columns
  minH: 1,                // Minimum grid rows
  defaultW: 4,            // Default width when added
  defaultH: 2,            // Default height when added
  component: MyWidget,
  defaultProps: {
    label: 'Hello World',
    refreshSeconds: 30,
  },
});

export default MyWidget;
```

### Key points

- Call `registerWidget()` at the module's top level — it runs when the file is imported.
- The `type` string must be unique across all widgets.
- `icon` references a Lucide icon name. Check `src/lib/icon-names.ts` for the full list.
- `minW`/`minH` constrain the smallest size in the grid editor.
- `defaultProps` are the initial values when the widget is first added.

## Step 2 — Create the options panel (optional)

If your widget has configurable properties, create an options component:

```tsx
// src/widgets/my-widget/MyWidgetOptions.tsx
import { FormInput, FormSwitch } from '@/components/ui';

interface MyWidgetOptionsProps {
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
}

export default function MyWidgetOptions({ data, onChange }: MyWidgetOptionsProps) {
  return (
    <div className="space-y-4">
      <FormInput
        label="Label"
        value={(data.label as string) ?? ''}
        onChange={(value) => onChange({ ...data, label: value })}
      />
      <FormInput
        label="Refresh interval (seconds)"
        type="number"
        value={String(data.refreshSeconds ?? 30)}
        onChange={(value) => onChange({ ...data, refreshSeconds: Number(value) })}
      />
    </div>
  );
}
```

Then reference it in your registration:

```tsx
import MyWidgetOptions from './MyWidgetOptions';

registerWidget({
  // ...other fields
  OptionsComponent: MyWidgetOptions,
});
```

### Built-in form components

The `@/components/ui` module exports reusable form controls styled to match the configurator:

| Component | Purpose |
|-----------|---------|
| `FormInput` | Text, number, URL inputs |
| `FormSelect` | Dropdown selects |
| `FormSwitch` | Boolean toggle switches |

## Step 3 — Register the import

Add your widget to `src/widgets/index.ts`:

```typescript
import './my-widget/MyWidget';
```

This ensures the widget's `registerWidget()` call runs when the application boots.

## Step 4 — Add the type to the config union

Open `src/lib/config.ts` and add your widget type to the `WidgetConfig.type` union:

```typescript
export interface WidgetConfig {
  type:
    | 'clock'
    | 'poster-carousel'
    // ...existing types
    | 'my-widget';  // Add here
  // ...
}
```

## Fetching external data

If your widget needs to fetch data from external APIs, use the caching utilities in `src/lib/data-cache.ts`:

```tsx
import { fetchJsonWithCache, buildProxyUrl, buildCacheKey } from '@/lib/data-cache';

// Inside your component:
const url = buildProxyUrl(corsProxy, 'https://api.example.com/data');
const { data } = await fetchJsonWithCache(url, {
  cacheKey: buildCacheKey('my-widget', url),
  ttlMs: 60_000,       // Cache for 60 seconds
  allowStale: true,     // Serve stale data if fetch fails
});
```

See the [CORS & Proxies guide](/docs/guides/cors-setup/) for details on proxy configuration.

## Existing widgets as reference

Study these widgets for patterns:

| Widget | Good example of |
|--------|-----------------|
| `clock` | Simple self-contained component, timer-based updates |
| `weather` | External API fetching with CORS proxy |
| `events-list` | iCal feed parsing, mixed static/dynamic data |
| `news-ticker` | RSS feed parsing, animation |
| `poster-carousel` | Image rotation, configurable timing |
| `bus-connection` | GTFS real-time data, complex rendering |
