'use client';

import { useState, useEffect } from 'react';
import { FormInput, FormSelect } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

const LOCATION_PRESETS = [
  { value: 'prince-george', label: 'Prince George, BC', lat: 53.9171, lon: -122.7497 },
  { value: 'vancouver', label: 'Vancouver, BC', lat: 49.2827, lon: -123.1207 },
  { value: 'victoria', label: 'Victoria, BC', lat: 48.4284, lon: -123.3656 },
  { value: 'kamloops', label: 'Kamloops, BC', lat: 50.6745, lon: -120.3273 },
  { value: 'kelowna', label: 'Kelowna, BC', lat: 49.888, lon: -119.496 },
  { value: 'williams-lake', label: 'Williams Lake, BC', lat: 52.1417, lon: -122.1417 },
  { value: 'custom', label: 'Custom Coordinates…' },
];

const YEAR_OPTIONS = [
  { value: '2024', label: '2024 (Latest)' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
  { value: '2018', label: '2018' },
];

interface SatViewData {
  lat: number;
  lon: number;
  zoom: number;
  year: string;
  showLabel: boolean;
  locationLabel: string;
}

export default function SatelliteViewOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<SatViewData>({
    lat: (data?.lat as number) ?? 53.9171,
    lon: (data?.lon as number) ?? -122.7497,
    zoom: (data?.zoom as number) ?? 10,
    year: (data?.year as string) ?? '2024',
    showLabel: (data?.showLabel as boolean) ?? true,
    locationLabel: (data?.locationLabel as string) ?? '',
  });

  const [presetValue, setPresetValue] = useState(() => {
    const lat = (data?.lat as number) ?? 53.9171;
    const lon = (data?.lon as number) ?? -122.7497;
    const match = LOCATION_PRESETS.find(
      (p) => 'lat' in p && Math.abs(p.lat! - lat) < 0.01 && Math.abs(p.lon! - lon) < 0.01
    );
    return match?.value ?? 'custom';
  });

  useEffect(() => {
    if (data) {
      const lat = (data.lat as number) ?? 53.9171;
      const lon = (data.lon as number) ?? -122.7497;
      setState({
        lat,
        lon,
        zoom: (data.zoom as number) ?? 10,
        year: (data.year as string) ?? '2024',
        showLabel: (data.showLabel as boolean) ?? true,
        locationLabel: (data.locationLabel as string) ?? '',
      });
      const match = LOCATION_PRESETS.find(
        (p) => 'lat' in p && p.lat != null && Math.abs(p.lat - lat) < 0.01 && Math.abs(p.lon! - lon) < 0.01
      );
      setPresetValue(match?.value ?? 'custom');
    }
  }, [data]);

  const handleChange = (name: string, value: string | number | boolean) => {
    const newState = { ...state, [name]: value };
    setState(newState);
    onChange(newState);
  };

  const handlePreset = (_name: string, value: string) => {
    setPresetValue(value);
    if (value !== 'custom') {
      const preset = LOCATION_PRESETS.find((p) => p.value === value);
      if (preset && 'lat' in preset && preset.lat != null) {
        const newState = {
          ...state,
          lat: preset.lat,
          lon: preset.lon!,
          locationLabel: preset.label,
        };
        setState(newState);
        onChange(newState);
      }
    }
  };

  const isCustom = presetValue === 'custom';

  return (
    <div className="space-y-6 w-full max-w-xl mx-auto">
      <div className="space-y-4">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Location</h3>

        <FormSelect
          label="Location Preset"
          name="locationPreset"
          value={presetValue}
          options={LOCATION_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          onChange={handlePreset}
        />

        {isCustom && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Latitude"
                name="lat"
                type="number"
                value={state.lat}
                onChange={handleChange}
              />
              <FormInput
                label="Longitude"
                name="lon"
                type="number"
                value={state.lon}
                onChange={handleChange}
              />
            </div>
            <FormInput
              label="Location Label (optional)"
              name="locationLabel"
              type="text"
              value={state.locationLabel}
              placeholder="My Campus"
              onChange={handleChange}
            />
          </>
        )}

        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Select a location or enter custom coordinates to display Sentinel-2
          satellite imagery. No API key required — imagery is free from the EOX
          Sentinel-2 cloudless project.
        </div>
      </div>

      <div className="space-y-4 border-t border-[color:var(--ui-item-border)] pt-6">
        <h3 className="font-semibold text-[var(--ui-text)] text-center">Imagery</h3>

        <FormSelect
          label="Imagery Year"
          name="year"
          value={state.year}
          options={YEAR_OPTIONS}
          onChange={handleChange}
        />

        <FormInput
          label="Zoom Level (1–13)"
          name="zoom"
          type="number"
          value={state.zoom}
          min={1}
          max={13}
          onChange={handleChange}
        />
        <div className="text-xs text-[var(--ui-text-muted)] text-center">
          Zoom 8–9 shows a region, 10–11 shows a city, 12–13 shows
          neighbourhood detail. Max resolution is ~10m/pixel at zoom 13.
        </div>
      </div>

      {/* Preview tile */}
      <div className="border-t border-[color:var(--ui-item-border)] pt-6">
        <h4 className="font-semibold text-[var(--ui-text)] mb-4 text-center">
          Sample Tile
        </h4>
        <div className="bg-[var(--ui-item-bg)] rounded-xl p-3 flex flex-col items-center gap-2">
          <img
            src={(() => {
              const n = Math.pow(2, Math.min(8, state.zoom));
              const x = Math.floor(((state.lon + 180) / 360) * n);
              const latRad = (state.lat * Math.PI) / 180;
              const y = Math.floor(
                ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
              );
              const layer = state.year === '2016' ? 's2cloudless' : `s2cloudless-${state.year}`;
              return `https://a.tiles.maps.eox.at/wmts/1.0.0/${layer}_3857/default/GoogleMapsCompatible/${Math.min(8, state.zoom)}/${y}/${x}.jpg`;
            })()}
            alt="Satellite preview"
            className="w-48 h-48 rounded-lg object-cover"
            style={{ imageRendering: 'auto' }}
          />
          <div className="text-xs text-[var(--ui-text-muted)]">
            {state.lat.toFixed(4)}, {state.lon.toFixed(4)} &bull; Zoom{' '}
            {Math.min(8, state.zoom)}
          </div>
        </div>
      </div>
    </div>
  );
}
