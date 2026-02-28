'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FormInput, FormSwitch } from '@/components/ui';
import type { WidgetOptionsProps } from '@/lib/widget-registry';

// Dynamically import maplibre to avoid SSR issues
let maplibregl: typeof import('maplibre-gl') | null = null;
if (typeof window !== 'undefined') {
  import('maplibre-gl').then((mod) => {
    maplibregl = mod;
  });
}

interface AirQualityData {
  latitude: number;
  longitude: number;
  locationName: string;
  refreshInterval: number;
  showDetails: boolean;
}

export default function AirQualityOptions({ data, onChange }: WidgetOptionsProps) {
  const [state, setState] = useState<AirQualityData>({
    latitude: (data?.latitude as number) ?? 53.8931,
    longitude: (data?.longitude as number) ?? -122.8142,
    locationName: (data?.locationName as string) ?? 'UNBC Campus',
    refreshInterval: (data?.refreshInterval as number) ?? 15,
    showDetails: (data?.showDetails as boolean) ?? true,
  });
  const [mapReady, setMapReady] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (data) {
      setState({
        latitude: (data.latitude as number) ?? 53.8931,
        longitude: (data.longitude as number) ?? -122.8142,
        locationName: (data.locationName as string) ?? 'UNBC Campus',
        refreshInterval: (data.refreshInterval as number) ?? 15,
        showDetails: (data.showDetails as boolean) ?? true,
      });
    }
  }, [data]);

  const propagate = useCallback(
    (newState: AirQualityData) => {
      setState(newState);
      onChange(newState as unknown as Record<string, unknown>);
    },
    [onChange]
  );

  const handleChange = (name: string, value: string | number | boolean) => {
    propagate({ ...state, [name]: value });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let map: maplibregl.Map | null = null;

    const initMap = async () => {
      // Wait for maplibre-gl to load
      if (!maplibregl) {
        const mod = await import('maplibre-gl');
        if (cancelled) return;
        maplibregl = mod;
      }

      const ml = maplibregl;
      if (!mapContainerRef.current || cancelled) return;

      map = new ml.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm',
            },
          ],
        },
        center: [state.longitude, state.latitude],
        zoom: 10,
      });

      // Add navigation controls
      map.addControl(new ml.NavigationControl(), 'top-right');

      // Add initial marker
      const marker = new ml.Marker({ color: '#ef4444' })
        .setLngLat([state.longitude, state.latitude])
        .addTo(map);

      markerRef.current = marker;
      mapRef.current = map;

      // Click handler to move marker and update coordinates
      map.on('click', (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        propagate({
          ...state,
          latitude: Math.round(lat * 10000) / 10000,
          longitude: Math.round(lng * 10000) / 10000,
        });
      });

      setMapReady(true);
    };

    initMap();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Only initialize once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when lat/lng changes from text inputs
  useEffect(() => {
    if (markerRef.current && mapReady) {
      markerRef.current.setLngLat([state.longitude, state.latitude]);
      mapRef.current?.flyTo({ center: [state.longitude, state.latitude], duration: 500 });
    }
  }, [state.latitude, state.longitude, mapReady]);

  return (
    <div className="space-y-4">
      <FormInput
        label="Location Name"
        name="locationName"
        value={state.locationName}
        placeholder="UNBC Campus"
        onChange={handleChange}
      />

      {/* Map Picker */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-[var(--ui-text-muted)]">
          Click the map to set coordinates
        </label>
        <div
          ref={mapContainerRef}
          className="w-full h-56 rounded-lg overflow-hidden border"
          style={{ border: '1px solid var(--ui-input-border)' }}
        />
        {/* Import maplibre CSS */}
        <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css" />
      </div>

      {/* Coordinate inputs */}
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Latitude"
          name="latitude"
          type="number"
          value={state.latitude}
          step={0.0001}
          onChange={handleChange}
        />
        <FormInput
          label="Longitude"
          name="longitude"
          type="number"
          value={state.longitude}
          step={0.0001}
          onChange={handleChange}
        />
      </div>

      <div className="text-sm text-[var(--ui-text-muted)]">
        Uses the free Open-Meteo Air Quality API. No API key required.
      </div>

      <FormInput
        label="Refresh Interval (minutes)"
        name="refreshInterval"
        type="number"
        value={state.refreshInterval}
        min={5}
        max={1440}
        onChange={handleChange}
      />

      <FormSwitch
        label="Show detailed pollutant readings"
        name="showDetails"
        checked={state.showDetails}
        onChange={handleChange}
      />
    </div>
  );
}
