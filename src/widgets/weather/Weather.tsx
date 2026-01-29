'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import WeatherOptions from './WeatherOptions';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  location: string;
}

interface WeatherConfig {
  location?: string;
  units?: 'celsius' | 'fahrenheit';
  apiKey?: string;
  showDetails?: boolean;
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  'partly-cloudy': '⛅',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
  foggy: '🌫️',
  windy: '💨',
  default: '🌤️',
};

// Mock weather data for demo
const MOCK_WEATHER: WeatherData = {
  temp: 72,
  condition: 'partly-cloudy',
  icon: 'partly-cloudy',
  humidity: 45,
  wind: 8,
  location: 'Campus',
};

export default function Weather({ config, theme }: WidgetComponentProps) {
  const weatherConfig = config as WeatherConfig | undefined;
  const units = weatherConfig?.units ?? 'fahrenheit';
  const showDetails = weatherConfig?.showDetails ?? true;
  const location = weatherConfig?.location ?? 'Campus';

  const [weather, setWeather] = useState<WeatherData>({
    ...MOCK_WEATHER,
    location,
  });
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Convert temperature based on units
  const displayTemp = units === 'celsius'
    ? Math.round((weather.temp - 32) * 5 / 9)
    : weather.temp;

  const tempUnit = units === 'celsius' ? '°C' : '°F';

  return (
    <div className="h-full flex flex-col justify-center p-6" style={{ backgroundColor: `${theme.primary}20` }}>
      {/* Location */}
      <div className="text-sm font-medium opacity-70 mb-2" style={{ color: theme.accent }}>
        {weather.location}
      </div>

      {/* Main weather display */}
      <div className="flex items-center gap-4">
        <span className="text-5xl">
          {WEATHER_ICONS[weather.icon] || WEATHER_ICONS.default}
        </span>
        <div>
          <div className="text-4xl font-bold text-white">
            {displayTemp}{tempUnit}
          </div>
          <div className="text-sm text-white/70 capitalize">
            {weather.condition.replace('-', ' ')}
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 flex gap-4 text-sm text-white/60">
          <div className="flex items-center gap-1">
            <span>💧</span>
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💨</span>
            <span>{weather.wind} mph</span>
          </div>
        </div>
      )}

      {/* Last updated */}
      {currentTime && (
        <div className="mt-3 text-xs text-white/40">
          Updated {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'weather',
  name: 'Weather',
  description: 'Display current weather conditions',
  icon: '🌤️',
  minW: 2,
  minH: 2,
  maxW: 4,
  maxH: 3,
  defaultW: 3,
  defaultH: 2,
  component: Weather,
  OptionsComponent: WeatherOptions,
  defaultProps: {
    location: 'Campus',
    units: 'fahrenheit',
    showDetails: true,
  },
});
