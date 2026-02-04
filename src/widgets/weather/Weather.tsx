'use client';

import { useState, useEffect } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, fetchJsonWithCache } from '@/lib/data-cache';
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

const mapWeatherIcon = (condition: string): string => {
  const key = condition.toLowerCase();
  if (key.includes('clear')) return 'sunny';
  if (key.includes('cloud')) return 'cloudy';
  if (key.includes('rain')) return 'rainy';
  if (key.includes('storm') || key.includes('thunder')) return 'stormy';
  if (key.includes('snow')) return 'snowy';
  if (key.includes('fog') || key.includes('mist') || key.includes('haze')) return 'foggy';
  if (key.includes('wind')) return 'windy';
  return 'default';
};

export default function Weather({ config, theme }: WidgetComponentProps) {
  const weatherConfig = config as WeatherConfig | undefined;
  const units = weatherConfig?.units ?? 'fahrenheit';
  const showDetails = weatherConfig?.showDetails ?? true;
  const location = weatherConfig?.location ?? 'Campus';
  const apiKey = weatherConfig?.apiKey?.trim();

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

  useEffect(() => {
    if (!apiKey) {
      const temp = units === 'celsius'
        ? Math.round((MOCK_WEATHER.temp - 32) * 5 / 9)
        : MOCK_WEATHER.temp;
      setWeather({ ...MOCK_WEATHER, temp, location });
      return;
    }

    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const unitParam = units === 'celsius' ? 'metric' : 'imperial';
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          location
        )}&units=${unitParam}&appid=${apiKey}`;
        const { data } = await fetchJsonWithCache<any>(url, {
          cacheKey: buildCacheKey('weather', `${location}:${unitParam}`),
          ttlMs: 10 * 60 * 1000,
        });

        if (!isMounted) return;
        const condition = data?.weather?.[0]?.main ?? 'Clear';
        const description = data?.weather?.[0]?.description ?? condition;
        const windSpeed = typeof data?.wind?.speed === 'number' ? data.wind.speed : MOCK_WEATHER.wind;
        const windMph = units === 'celsius' ? Math.round(windSpeed * 2.23694) : Math.round(windSpeed);

        setWeather({
          temp: Math.round(data?.main?.temp ?? MOCK_WEATHER.temp),
          condition: description,
          icon: mapWeatherIcon(condition),
          humidity: Math.round(data?.main?.humidity ?? MOCK_WEATHER.humidity),
          wind: windMph,
          location,
        });
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiKey, location, units]);

  const displayTemp = weather.temp;
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
            {weather.condition.replace(/-/g, ' ')}
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
    apiKey: '',
  },
});
