'use client';

import { useState, useEffect, useRef } from 'react';
import { FormInput, FormSelect, FormSwitch } from '@/components/ui';
import { applyCorsProxy } from '@/hooks/useEvents';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

type DisplayMode = 'scroll' | 'ticker' | 'paginate';

interface CategoryInfo {
  name: string;
  color?: string;
}

interface EventsListData {
  title: string;
  maxItems: number;
  displayMode: DisplayMode;
  rotationSeconds: number;
  apiUrl: string;
  sourceType: 'json' | 'ical' | 'rss';
  corsProxy: string;
  cacheTtlSeconds: number;
  selectedCategories: string[];
}

export default function EventsListOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<EventsListData>({
    title: (data?.title as string) ?? 'Upcoming Events',
    maxItems: (data?.maxItems as number) ?? 10,
    displayMode: (data?.displayMode as DisplayMode) ?? 'scroll',
    rotationSeconds: (data?.rotationSeconds as number) ?? 5,
    apiUrl: (data?.apiUrl as string) ?? '',
    sourceType: (data?.sourceType as 'json' | 'ical' | 'rss') ?? 'json',
    corsProxy: (data?.corsProxy as string) ?? '',
    cacheTtlSeconds: (data?.cacheTtlSeconds as number) ?? 300,
    selectedCategories: (data?.selectedCategories as string[]) ?? [],
  });

  const [availableCategories, setAvailableCategories] = useState<CategoryInfo[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const fetchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (data) {
      setState({
        title: (data.title as string) ?? 'Upcoming Events',
        maxItems: (data.maxItems as number) ?? 10,
        displayMode: (data.displayMode as DisplayMode) ?? 'scroll',
        rotationSeconds: (data.rotationSeconds as number) ?? 5,
        apiUrl: (data.apiUrl as string) ?? '',
        sourceType: (data.sourceType as 'json' | 'ical' | 'rss') ?? 'json',
        corsProxy: (data.corsProxy as string) ?? '',
        cacheTtlSeconds: (data.cacheTtlSeconds as number) ?? 300,
        selectedCategories: (data.selectedCategories as string[]) ?? [],
      });
    }
  }, [data]);

  // Fetch categories when apiUrl or corsProxy changes (JSON only)
  useEffect(() => {
    if (!state.apiUrl || state.sourceType !== 'json') {
      setAvailableCategories([]);
      setCategoryError('');
      return;
    }

    // Debounce to avoid fetching on every keystroke
    const timeout = setTimeout(() => {
      fetchControllerRef.current?.abort();
      const controller = new AbortController();
      fetchControllerRef.current = controller;

      setCategoryLoading(true);
      setCategoryError('');

      const fetchUrl = applyCorsProxy(state.apiUrl, state.corsProxy?.trim());

      fetch(fetchUrl, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json: unknown) => {
          const list = Array.isArray(json) ? json : (json as Record<string, unknown>)?.events;
          if (!Array.isArray(list)) {
            setAvailableCategories([]);
            return;
          }

          const categoryMap = new Map<string, string | undefined>();
          for (const item of list) {
            const cat = (item as Record<string, unknown>).category as string | undefined;
            const color = (item as Record<string, unknown>).color as string | undefined;
            if (cat && !categoryMap.has(cat)) {
              categoryMap.set(cat, color);
            }
          }

          const categories: CategoryInfo[] = [];
          categoryMap.forEach((color, name) => categories.push({ name, color }));
          categories.sort((a, b) => a.name.localeCompare(b.name));
          setAvailableCategories(categories);

          // If no categories are selected yet, auto-select all
          if (state.selectedCategories.length === 0 && categories.length > 0) {
            const allNames = categories.map(c => c.name);
            const newState = { ...state, selectedCategories: allNames };
            setState(newState);
            onChange(newState);
          }
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          setCategoryError('Could not load categories');
          setAvailableCategories([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setCategoryLoading(false);
        });
    }, 600);

    return () => {
      clearTimeout(timeout);
      fetchControllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.apiUrl, state.corsProxy, state.sourceType]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handleCategoryToggle = (categoryName: string, enabled: boolean) => {
    const updated = enabled
      ? [...state.selectedCategories, categoryName]
      : state.selectedCategories.filter(c => c !== categoryName);
    const newState = { ...state, selectedCategories: updated };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Display Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)]">Display Settings</h3>

        <FormInput
          label="Widget Title"
          name="title"
          type="text"
          value={state.title}
          placeholder="Upcoming Events"
          onChange={handleChange}
        />

        <FormInput
          label="Maximum Items"
          name="maxItems"
          type="number"
          value={state.maxItems}
          min={1}
          max={20}
          onChange={handleChange}
        />

        <FormSelect
          label="Display Mode"
          name="displayMode"
          value={state.displayMode}
          options={[
            { value: 'scroll', label: 'Scroll (static list)' },
            { value: 'ticker', label: 'Ticker (one at a time)' },
            { value: 'paginate', label: 'Paginate (auto-fit)' },
          ]}
          onChange={handleChange}
        />

        {state.displayMode !== 'scroll' && (
          <>
            <FormInput
              label="Rotation Speed (seconds)"
              name="rotationSeconds"
              type="number"
              value={state.rotationSeconds}
              min={2}
              max={30}
              onChange={handleChange}
            />
            {state.displayMode === 'paginate' && (
              <div className="text-xs text-[var(--ui-text-muted)]">
                Items per page adjusts automatically based on widget height.
              </div>
            )}
          </>
        )}
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)]">Data Source</h3>

        <FormSelect
          label="Source Type"
          name="sourceType"
          value={state.sourceType}
          options={[
            { value: 'json', label: 'JSON API' },
            { value: 'ical', label: 'iCal (Google/Outlook)' },
            { value: 'rss', label: 'RSS Feed' },
          ]}
          onChange={handleChange}
        />

        <FormInput
          label="API URL (optional)"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder="https://api.example.com/events"
          onChange={handleChange}
        />

        <FormInput
          label="CORS Proxy (optional)"
          name="corsProxy"
          type="text"
          value={state.corsProxy}
          placeholder="https://r.jina.ai/http://"
          onChange={handleChange}
        />

        <FormInput
          label="Cache TTL (seconds)"
          name="cacheTtlSeconds"
          type="number"
          value={state.cacheTtlSeconds}
          min={30}
          max={3600}
          onChange={handleChange}
        />

        {/* Dynamic Category Filter */}
        {state.sourceType === 'json' && state.apiUrl && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="block text-sm font-medium text-[var(--ui-text-muted)]">
                Filter by Category
              </label>
              {categoryLoading && (
                <div className="w-3.5 h-3.5 border-2 border-[var(--ui-text-muted)] border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {categoryError && (
              <div className="text-xs text-red-400">{categoryError}</div>
            )}
            {availableCategories.length > 0 && (
              <div className="space-y-2 pl-1">
                {availableCategories.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    {cat.color && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    <div className="flex-1">
                      <FormSwitch
                        label={cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                        name={cat.name}
                        checked={state.selectedCategories.includes(cat.name)}
                        onChange={(name, checked) => handleCategoryToggle(name, checked)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!categoryLoading && !categoryError && availableCategories.length === 0 && state.apiUrl && (
              <div className="text-xs text-[var(--ui-text-muted)]">
                No categories found in the API response.
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-[var(--ui-text-muted)]">
          Leave empty to use default sample events.
          {state.sourceType === 'json' && (
            <code className="block mt-2 p-2 bg-[var(--ui-item-bg)] rounded text-xs">
              {`[{ "title": "...", "date": "Mar 10", "time": "11:00 AM", "location": "..." }]`}
            </code>
          )}
          {state.sourceType === 'ical' && (
            <div className="mt-2 text-xs">
              Use a public iCal URL (Google/Outlook calendars can export this).
            </div>
          )}
          {state.sourceType === 'rss' && (
            <div className="mt-2 text-xs">
              RSS items are mapped into events using the item title and publish date.
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4">Preview</h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-4">
          <div className="flex items-center gap-2 text-[var(--color-accent)] mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-bold">{state.title}</span>
            {state.displayMode !== 'scroll' && (
              <span className="text-white/40 text-xs ml-auto">
                {state.displayMode === 'ticker' ? 'auto-cycles' : 'auto-fit pages'}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {['Club Fair', 'Guest Lecture', 'Open Mic Night']
              .slice(0, state.displayMode === 'ticker' ? 1 : Math.min(3, state.maxItems))
              .map((event, i) => (
                <div key={i} className="p-2 rounded-lg bg-white/10 border-l-2 border-[var(--color-accent)]">
                  <div className="text-white text-sm font-medium">{event}</div>
                  <div className="text-white/60 text-xs">Mar {10 + i} • 11:00 AM</div>
                </div>
              ))}
          </div>
          {state.displayMode !== 'scroll' && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: state.displayMode === 'ticker' ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: i === 0 ? 'var(--color-accent)' : 'rgba(255,255,255,0.2)' }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
