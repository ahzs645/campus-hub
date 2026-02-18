'use client';

import { useState, useEffect, useCallback } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import { getAllWidgets, getWidget } from '@/lib/widget-registry';
import type { WidgetOptionsProps } from '@/lib/widget-registry';
import type { ChildWidgetDef } from './WidgetStack';
import AppIcon from '@/components/AppIcon';

interface WidgetStackData {
  rotationSeconds: number;
  animationMode: string;
  children: ChildWidgetDef[];
}

const ANIMATION_MODES = [
  { value: 'fade', label: 'Fade' },
  { value: 'stack', label: 'Stack' },
  { value: 'carousel', label: 'Carousel' },
];

// Prevent recursion and exclude widgets that need full width
const EXCLUDED_TYPES = new Set(['widget-stack', 'news-ticker']);

export default function WidgetStackOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<WidgetStackData>({
    rotationSeconds: (data?.rotationSeconds as number) ?? 8,
    animationMode: (data?.animationMode as string) ?? 'fade',
    children: (data?.children as ChildWidgetDef[]) ?? [],
  });
  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);

  useEffect(() => {
    if (data) {
      setState({
        rotationSeconds: (data.rotationSeconds as number) ?? 8,
        animationMode: (data.animationMode as string) ?? 'fade',
        children: (data.children as ChildWidgetDef[]) ?? [],
      });
    }
  }, [data]);

  const propagate = useCallback(
    (newState: WidgetStackData) => {
      setState(newState);
      onChange(newState as unknown as Record<string, unknown>);
    },
    [onChange]
  );

  const handleTopLevelChange = (name: string, value: string | number | boolean) => {
    propagate({ ...state, [name]: value });
  };

  const addChild = (type: string) => {
    const widgetDef = getWidget(type);
    const newChild: ChildWidgetDef = {
      id: `${type}-${Date.now()}`,
      type,
      props: widgetDef?.defaultProps ?? {},
    };
    propagate({ ...state, children: [...state.children, newChild] });
    setShowAddPicker(false);
    setExpandedChildId(newChild.id);
  };

  const removeChild = (id: string) => {
    propagate({ ...state, children: state.children.filter((c) => c.id !== id) });
    if (expandedChildId === id) setExpandedChildId(null);
  };

  const moveChild = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.children.length) return;
    const newChildren = [...state.children];
    [newChildren[index], newChildren[newIndex]] = [newChildren[newIndex], newChildren[index]];
    propagate({ ...state, children: newChildren });
  };

  const updateChildProps = (id: string, newProps: Record<string, unknown>) => {
    propagate({
      ...state,
      children: state.children.map((c) => (c.id === id ? { ...c, props: newProps } : c)),
    });
  };

  const availableWidgets = getAllWidgets().filter((w) => !EXCLUDED_TYPES.has(w.type));

  return (
    <div className="space-y-6">
      {/* Display Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Settings</h3>

        <FormSelect
          label="Animation Mode"
          name="animationMode"
          value={state.animationMode}
          options={ANIMATION_MODES}
          onChange={handleTopLevelChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          {state.animationMode === 'fade' && 'Crossfade between widgets with a progress bar.'}
          {state.animationMode === 'stack' && 'Stacked cards with rotation. Active widget shuffles to the top.'}
          {state.animationMode === 'carousel' && '3D perspective carousel. Widgets fan out with depth.'}
        </div>

        <FormInput
          label="Rotation Speed (seconds)"
          name="rotationSeconds"
          type="number"
          value={state.rotationSeconds}
          min={3}
          max={120}
          onChange={handleTopLevelChange}
        />

        <div className="text-sm text-[var(--ui-text-muted)]">
          Each widget displays for {state.rotationSeconds} seconds before advancing.
        </div>
      </div>

      {/* Child Widgets */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">
          Widgets ({state.children.length})
        </h3>

        {state.children.length === 0 && (
          <div className="text-sm text-[var(--ui-text-muted)] py-4 text-center">
            No widgets added yet. Click &quot;Add Widget&quot; below.
          </div>
        )}

        {state.children.map((child, index) => {
          const childDef = getWidget(child.type);
          const isExpanded = expandedChildId === child.id;
          const ChildOptions = childDef?.OptionsComponent;

          return (
            <div
              key={child.id}
              className="border border-[color:var(--ui-item-border)] rounded-lg overflow-hidden"
            >
              {/* Child header row */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--ui-item-bg)]">
                {childDef && (
                  <AppIcon
                    name={childDef.icon}
                    className="w-4 h-4 text-[var(--ui-text-muted)] flex-shrink-0"
                  />
                )}
                <span className="text-sm font-medium text-[var(--ui-text)] flex-1 truncate">
                  {childDef?.name ?? child.type}
                </span>

                {/* Move up */}
                <button
                  onClick={() => moveChild(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>

                {/* Move down */}
                <button
                  onClick={() => moveChild(index, 1)}
                  disabled={index === state.children.length - 1}
                  className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expand/collapse */}
                {ChildOptions && (
                  <button
                    onClick={() => setExpandedChildId(isExpanded ? null : child.id)}
                    className="p-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                    title={isExpanded ? 'Collapse' : 'Configure'}
                  >
                    <svg
                      className="w-4 h-4 transition-transform duration-200"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                )}

                {/* Remove */}
                <button
                  onClick={() => removeChild(child.id)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Expanded child config */}
              {isExpanded && ChildOptions && (
                <div className="p-4 border-t border-[color:var(--ui-item-border)] bg-[var(--ui-panel-soft)]">
                  <ChildOptions
                    data={child.props ?? {}}
                    onChange={(newData) => updateChildProps(child.id, newData)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Add Widget */}
        <div className="relative">
          <button
            onClick={() => setShowAddPicker(!showAddPicker)}
            className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-[color:var(--ui-item-border)] text-[var(--ui-text-muted)] hover:border-[var(--ui-text)] hover:text-[var(--ui-text)] transition-colors text-sm"
          >
            + Add Widget
          </button>

          {showAddPicker && (
            <div className="mt-2 border border-[color:var(--ui-item-border)] rounded-lg bg-[var(--ui-panel-solid)] max-h-60 overflow-y-auto">
              {availableWidgets.map((w) => (
                <button
                  key={w.type}
                  onClick={() => addChild(w.type)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--ui-text)] hover:bg-[var(--ui-item-hover)] transition-colors"
                >
                  <AppIcon
                    name={w.icon}
                    className="w-4 h-4 text-[var(--ui-text-muted)] flex-shrink-0"
                  />
                  <div className="text-left">
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-[var(--ui-text-muted)]">{w.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
