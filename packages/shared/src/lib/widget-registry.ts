// Widget Registry - Central hub for all widget types (cross-platform)
import { ComponentType } from 'react';
import type { WidgetComponentProps, WidgetOptionsProps } from './types';

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
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
