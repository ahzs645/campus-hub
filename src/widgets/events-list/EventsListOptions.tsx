'use client';

import { useState, useEffect } from 'react';
import { FormInput } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

interface EventsListData {
  title: string;
  maxItems: number;
  apiUrl: string;
}

export default function EventsListOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<EventsListData>({
    title: (data?.title as string) ?? 'Upcoming Events',
    maxItems: (data?.maxItems as number) ?? 10,
    apiUrl: (data?.apiUrl as string) ?? '',
  });

  useEffect(() => {
    if (data) {
      setState({
        title: (data.title as string) ?? 'Upcoming Events',
        maxItems: (data.maxItems as number) ?? 10,
        apiUrl: (data.apiUrl as string) ?? '',
      });
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Display Settings</h3>

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
      </div>

      {/* API Configuration */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-semibold text-gray-900">Data Source</h3>

        <FormInput
          label="API URL (optional)"
          name="apiUrl"
          type="url"
          value={state.apiUrl}
          placeholder="https://api.example.com/events"
          onChange={handleChange}
        />

        <div className="text-sm text-gray-500">
          Leave empty to use default sample events. The API should return an array:
          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs">
            {`[{ "title": "...", "date": "Mar 10", "time": "11:00 AM", "location": "..." }]`}
          </code>
        </div>
      </div>

      {/* Preview */}
      <div className="border-t pt-6">
        <h4 className="font-semibold text-gray-900 mb-4">Preview</h4>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-500 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-bold">{state.title}</span>
          </div>
          <div className="space-y-2">
            {['Club Fair', 'Guest Lecture', 'Open Mic Night'].slice(0, Math.min(3, state.maxItems)).map((event, i) => (
              <div key={i} className="p-2 rounded-lg bg-white/10 border-l-2 border-amber-500">
                <div className="text-white text-sm font-medium">{event}</div>
                <div className="text-white/60 text-xs">Mar {10 + i} • 11:00 AM</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
