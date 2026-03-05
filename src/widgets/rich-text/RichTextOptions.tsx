'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface RichTextData {
  content: string;
  scrollSpeed: number;
  fontSize: number;
  textColor: string;
  scrollDirection: 'up' | 'down';
  pauseOnHover: boolean;
}

export default function RichTextOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<RichTextData>({
    content: (data?.content as string) ?? '',
    scrollSpeed: (data?.scrollSpeed as number) ?? 40,
    fontSize: (data?.fontSize as number) ?? 16,
    textColor: (data?.textColor as string) ?? '',
    scrollDirection: (data?.scrollDirection as 'up' | 'down') ?? 'up',
    pauseOnHover: (data?.pauseOnHover as boolean) ?? false,
  });

  useEffect(() => {
    if (data) {
      setState({
        content: (data.content as string) ?? '',
        scrollSpeed: (data.scrollSpeed as number) ?? 40,
        fontSize: (data.fontSize as number) ?? 16,
        textColor: (data.textColor as string) ?? '',
        scrollDirection: (data.scrollDirection as 'up' | 'down') ?? 'up',
        pauseOnHover: (data.pauseOnHover as boolean) ?? false,
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newState = { ...state, content: e.target.value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Content</h3>

        <div>
          <label className="block text-sm font-medium text-[var(--ui-text)] mb-1">
            Text Content (Markdown supported)
          </label>
          <textarea
            value={state.content}
            onChange={handleContentChange}
            rows={10}
            placeholder="## Heading&#10;&#10;**Bold text** and *italic text*&#10;&#10;> Blockquote&#10;&#10;---&#10;&#10;Regular paragraph text..."
            className="w-full rounded-lg border border-[color:var(--ui-item-border)] bg-[var(--ui-item-bg)] text-[var(--ui-text)] px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <div className="text-xs text-[var(--ui-text-muted)] mt-1">
            Supports: # headings, **bold**, *italic*, &gt; blockquotes, --- horizontal rules
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Scroll Settings</h3>

        <FormInput
          label="Scroll Speed"
          name="scrollSpeed"
          type="number"
          value={state.scrollSpeed}
          min={10}
          max={120}
          onChange={handleChange}
        />
        <div className="text-sm text-[var(--ui-text-muted)] text-center">
          Higher = slower scrolling. Content auto-scrolls only when it overflows the widget.
        </div>

        <FormSelect
          label="Scroll Direction"
          name="scrollDirection"
          value={state.scrollDirection}
          options={[
            { value: 'up', label: 'Up' },
            { value: 'down', label: 'Down' },
          ]}
          onChange={handleChange}
        />

        <FormSwitch
          label="Pause on Hover"
          name="pauseOnHover"
          checked={state.pauseOnHover}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Appearance</h3>

        <FormInput
          label="Font Size (px)"
          name="fontSize"
          type="number"
          value={state.fontSize}
          min={10}
          max={48}
          onChange={handleChange}
        />

        <FormInput
          label="Text Color (optional)"
          name="textColor"
          type="text"
          value={state.textColor}
          placeholder="Leave empty for theme accent color"
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
