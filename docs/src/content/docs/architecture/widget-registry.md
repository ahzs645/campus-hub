---
title: Widget Registry
description: How widgets are discovered and registered.
draft: false
---

The widget registry maps widget type strings (like `"clock"` or `"weather"`) to
their manifests and lazily loaded components. It lives in the
[widget SDK](https://github.com/ahzs645/campus-hub-widget-sdk) and is re-exported
by `@firstform/campus-hub-engine`.

## Discovery

Every widget package declares itself in its `package.json`:

```json
{ "campusHub": { "widgets": "./src/index.ts" } }
```

The package entry registers each widget's `meta.ts`:

```ts
import { registerWidgetModule } from '@firstform/campus-hub-widget-sdk';
import clock from './clock/meta';

registerWidgetModule(clock);
```

Importing `@firstform/campus-hub-engine/widgets` loads the installed widget
packages, which fills the registry. Only manifests are loaded up front; a
widget's component (`load()`) and options panel (`loadOptions()`) are imported
the first time a board places or edits that widget.

## Reading the registry

The SDK (and the engine, which re-exports it) provides:

| Function | Returns |
|----------|---------|
| `getWidget(type)` | The widget's definition (manifest fields), or `undefined` |
| `getAllWidgets()` | Every registered definition, e.g. for the gallery and the configurator's widget picker |
| `getWidgetComponent(type)` | The lazily loaded component for rendering |

`WidgetRenderer` from the engine renders a placed widget by type, loading its
component on demand.

See the SDK's
[authoring guide](https://github.com/ahzs645/campus-hub-widget-sdk/blob/main/docs/authoring-widgets.md)
for the full contract.
