---
title: Developing Widgets
description: How to create custom widgets for Campus Hub.
draft: false
---

Widgets no longer live in this repository. Each widget belongs to a **widget
package** built with the
[Campus Hub Widget SDK](https://github.com/ahzs645/campus-hub-widget-sdk), and the
host app discovers every installed package at build time. The built-in widgets
are in [campus-hub-widgets](https://github.com/ahzs645/campus-hub-widgets),
checked out here as the `packages/campus-hub-widgets` submodule.

The full contract, dependency rules and a copyable starter package are in the
SDK's
[Building a Campus Hub widget](https://github.com/ahzs645/campus-hub-widget-sdk/blob/main/docs/authoring-widgets.md)
guide. This page is a short orientation.

## Layout of a widget

```
packages/<category>/src/<widget>/
  meta.ts               manifest + loaders; no component or library imports
  <Widget>.tsx          the component, reached only through meta's load()
  <Widget>Options.tsx   optional options panel, reached through loadOptions()
```

`meta.ts` declares the widget with `defineWidget`:

```ts
import { defineWidget } from '@firstform/campus-hub-widget-sdk';

export default defineWidget({
  manifest: {
    type: 'my-widget',
    name: 'My Widget',
    description: 'A custom widget',
    icon: 'puzzle',
    minW: 2, minH: 2, defaultW: 3, defaultH: 2,
    defaultProps: { label: 'Hello' },
  },
  load: () => import('./MyWidget'),
  loadOptions: () => import('./MyWidgetOptions'), // omit if using optionsSchema
});
```

The component receives `WidgetComponentProps` (`config`, `theme`, `corsProxy`, …):

```tsx
import type { WidgetComponentProps } from '@firstform/campus-hub-widget-sdk';

export default function MyWidget({ config, theme }: WidgetComponentProps) {
  return <div style={{ color: theme.accent }}>{String(config?.label ?? '')}</div>;
}
```

The package's entry registers its widgets with `registerWidgetModule(meta)`, and
its `package.json` declares `"campusHub": { "widgets": "./src/index.ts" }` so
hosts discover it on install. There is no registration file to edit in the host.

## Fetching data

Use the SDK's cached fetch helpers (`fetchJsonWithCache`, `fetchTextWithCache`,
`buildCacheKey`, `buildProxyUrl`); see [External Data](/docs/guides/external-data/).
Show demo data only when no source is configured, always with a visible "Demo"
badge. When a configured source fails, keep the last good data, or show an
unavailable state; never fall back to demo data.

## Trying a widget here

Work inside the `packages/campus-hub-widgets` submodule (or point a local
package at the SDK as the SDK guide describes), run `npm run dev` in this repo,
and open `/gallery` or `/configure`.
