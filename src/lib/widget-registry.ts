// Widget Registry - Central hub for all widget types
import { ComponentType } from 'react';
import type { IconName } from './icon-names';

export interface WidgetComponentProps {
  config?: Record<string, unknown>;
  theme: {
    primary: string;
    accent: string;
    background: string;
  };
}

export interface WidgetOptionsProps {
  data: Record<string, unknown>;
  onChange: (newData: Record<string, unknown>) => void;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: IconName;
  minW: number;
  minH: number;
  maxW?: number;
  maxH?: number;
  defaultW: number;
  defaultH: number;
  component: ComponentType<WidgetComponentProps>;
  OptionsComponent?: ComponentType<WidgetOptionsProps>;
  defaultProps?: Record<string, unknown>;
}

// Widget registry - widgets register themselves here
const registry: Map<string, WidgetDefinition> = new Map();

export function registerWidget(definition: WidgetDefinition): void {
  registry.set(definition.type, definition);
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

export function getWidgetComponent(type: string): ComponentType<WidgetComponentProps> | null {
  const widget = registry.get(type);
  return widget?.component ?? null;
}
