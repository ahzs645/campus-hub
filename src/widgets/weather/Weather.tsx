'use client';

import { useState, useEffect, useCallback } from 'react';
import { WidgetComponentProps, registerWidget } from '@/lib/widget-registry';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '@/lib/data-cache';
import { useFitScale } from '@/hooks/useFitScale';
import AppIcon from '@/components/AppIcon';
import type { IconName } from '@/lib/icon-names';
import WeatherOptions from './WeatherOptions';

type WeatherIconKey =
  | 'sunny'
  | 'cloudy'
  | 'partly-cloudy'
  | 'rainy'
  | 'stormy'
  | 'snowy'
  | 'foggy'
  | 'windy'
  | 'default';

interface WeatherData {
  temp: number;
  condition: string;
  icon: WeatherIconKey;
  humidity: number;
  wind: number;
  location: string;
  pressure?: number;
  dewPoint?: number;
  windDir?: number;
  windGust?: number;
  precip?: number;
}

interface WeatherConfig {
  location?: string;
  units?: 'celsius' | 'fahrenheit';
  apiKey?: string;
  showDetails?: boolean;
  dataSource?: 'openweathermap' | 'unbc-rooftop';
  refreshInterval?: number; // minutes
  corsProxy?: string;
}

interface OpenWeatherResponse {
  weather?: Array<{
    main?: string;
    description?: string;
  }>;
  wind?: {
    speed?: number;
  };
  main?: {
    temp?: number;
    humidity?: number;
  };
}

const WEATHER_ICONS: Record<WeatherIconKey, IconName> = {
  sunny: 'sun',
  cloudy: 'cloud',
  'partly-cloudy': 'cloudSun',
  rainy: 'cloudRain',
  stormy: 'cloudLightning',
  snowy: 'snowflake',
  foggy: 'cloudFog',
  windy: 'wind',
  default: 'weather',
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

const mapWeatherIcon = (condition: string): WeatherIconKey => {
  const key = condition.toLowerCase();
  if (key.includes('clear') || key.includes('sunny')) return 'sunny';
  if (key.includes('cloud')) return 'cloudy';
  if (key.includes('rain')) return 'rainy';
  if (key.includes('storm') || key.includes('thunder')) return 'stormy';
  if (key.includes('snow')) return 'snowy';
  if (key.includes('fog') || key.includes('mist') || key.includes('haze')) return 'foggy';
  if (key.includes('wind')) return 'windy';
  return 'default';
};

const UNBC_URL = 'https://cyclone.unbc.ca/wx/data-table-std-1m.html';


/** Derive a simple condition string from UNBC rooftop sensor readings */
const deriveConditionFromUNBC = (
  temp: number,
  rh: number,
  windSpeed: number,
  precip: number,
  kdownTot: number,
): WeatherIconKey => {
  if (precip > 0 && temp <= 0) return 'snowy';
  if (precip > 0) return 'rainy';
  if (windSpeed > 10) return 'windy';
  if (rh > 95) return 'foggy';
  if (kdownTot > 300) return 'sunny';
  if (kdownTot > 100) return 'partly-cloudy';
  if (kdownTot > 20) return 'cloudy';
  return 'cloudy';
};

/** Parse the UNBC rooftop weather station HTML (unclosed td tags: <tr><td>val<td>val...) */
const parseUNBCWeatherData = (html: string, units: 'celsius' | 'fahrenheit'): WeatherData | null => {
  // Each data row looks like: <tr><td>2026-02-17 16:09:00<td>855726<td>-15.6<td>...
  // Find all lines containing a date pattern
  const lines = html.split('\n');
  let lastDataLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(lines[i])) {
      lastDataLine = lines[i];
      break;
    }
  }
  if (!lastDataLine) return null;

  // Split by <td> to get cell values (first split element is before the first <td>)
  const parts = lastDataLine.split(/<td>/i);
  // Remove the first empty/tr part, keep the cell values
  const cells = parts.slice(1).map(s => s.replace(/<\/td>|<\/tr>/gi, '').trim());

  // Columns: 0=DateTime, 1=Record, 2=TAir, 3=TDew, 4=RH, 5=Pstn, 6=Pmsl,
  //          7=Wspd_avg, 8=Wspd_vec, 9=Wdir, 10=Wstd, 11=Wgust, 12=Precip,
  //          13=Kdown_tot, ...
  if (cells.length < 13) return null;

  const tAir = parseFloat(cells[2] ?? '');
  const tDew = parseFloat(cells[3] ?? '');
  const rh = parseFloat(cells[4] ?? '');
  const pmsl = parseFloat(cells[6] ?? '');
  const wspdAvg = parseFloat(cells[7] ?? '');
  const wdir = parseFloat(cells[9] ?? '');
  const wgust = parseFloat(cells[11] ?? '');
  const precip = parseFloat(cells[12] ?? '');
  const kdownTot = cells.length > 13 ? parseFloat(cells[13] ?? '') : 0;

  if (isNaN(tAir)) return null;

  const tempC = tAir;
  const temp = units === 'fahrenheit' ? Math.round(tempC * 9 / 5 + 32) : Math.round(tempC * 10) / 10;
  const windDisplay = units === 'fahrenheit'
    ? Math.round(wspdAvg * 2.23694)
    : Math.round(wspdAvg * 10) / 10;
  const gustDisplay = units === 'fahrenheit'
    ? Math.round(wgust * 2.23694)
    : Math.round(wgust * 10) / 10;

  const condition = deriveConditionFromUNBC(tempC, rh, wspdAvg, precip, isNaN(kdownTot) ? 0 : kdownTot);

  return {
    temp,
    condition: condition.replace(/-/g, ' '),
    icon: condition,
    humidity: Math.round(rh),
    wind: windDisplay,
    location: 'UNBC Rooftop',
    pressure: Math.round(pmsl * 10) / 10,
    dewPoint: units === 'fahrenheit' ? Math.round(tDew * 9 / 5 + 32) : Math.round(tDew * 10) / 10,
    windDir: Math.round(wdir),
    windGust: gustDisplay,
    precip,
  };
};

export default function Weather({ config, theme, corsProxy: globalCorsProxy }: WidgetComponentProps) {
  const weatherConfig = config as WeatherConfig | undefined;
  const units = weatherConfig?.units ?? 'fahrenheit';
  const showDetails = weatherConfig?.showDetails ?? true;
  const location = weatherConfig?.location ?? 'Campus';
  const apiKey = weatherConfig?.apiKey?.trim();
  const dataSource = weatherConfig?.dataSource ?? 'openweathermap';
  const refreshInterval = weatherConfig?.refreshInterval ?? 10; // minutes
  const corsProxy = weatherConfig?.corsProxy?.trim() || globalCorsProxy;

  const [weather, setWeather] = useState<WeatherData>({
    ...MOCK_WEATHER,
    location: dataSource === 'unbc-rooftop' ? 'UNBC Rooftop' : location,
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshMs = refreshInterval * 60 * 1000;

  // UNBC Rooftop data source
  const fetchUNBC = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, UNBC_URL);
      const { text } = await fetchTextWithCache(fetchUrl, {
        cacheKey: buildCacheKey('weather-unbc', UNBC_URL),
        ttlMs: refreshMs,
      });
      const parsed = parseUNBCWeatherData(text, units);
      if (parsed) {
        setWeather(parsed);
        setLastUpdated(new Date());
      } else {
        setError('Failed to parse weather data');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [corsProxy, units, refreshMs]);

  // OpenWeatherMap data source
  const fetchOWM = useCallback(async () => {
    if (!apiKey) {
      const temp = units === 'celsius'
        ? Math.round((MOCK_WEATHER.temp - 32) * 5 / 9)
        : MOCK_WEATHER.temp;
      setWeather({ ...MOCK_WEATHER, temp, location });
      return;
    }
    try {
      const unitParam = units === 'celsius' ? 'metric' : 'imperial';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        location
      )}&units=${unitParam}&appid=${apiKey}`;
      const { data } = await fetchJsonWithCache<OpenWeatherResponse>(url, {
        cacheKey: buildCacheKey('weather', `${location}:${unitParam}`),
        ttlMs: refreshMs,
      });

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
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  }, [apiKey, location, units, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      if (!isMounted) return;
      if (dataSource === 'unbc-rooftop') {
        await fetchUNBC();
      } else {
        await fetchOWM();
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, refreshMs);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dataSource, fetchUNBC, fetchOWM, refreshMs]);

  const displayTemp = weather.temp;
  const tempUnit = units === 'celsius' ? '°C' : '°F';
  const windUnit = units === 'celsius' ? 'm/s' : 'mph';

  // Design at a fixed reference size; useFitScale will scale to fill container
  const DESIGN_W = 340;
  const DESIGN_H = 260;
  const { containerRef, scale } = useFitScale(DESIGN_W, DESIGN_H);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: `${theme.primary}20` }}
    >
      <div
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="flex flex-col justify-center p-6"
      >
        {/* Location */}
        <div className="text-lg font-medium opacity-70 mb-1" style={{ color: theme.accent }}>
          {weather.location}
        </div>

        {/* Main weather display */}
        <div className="flex items-center gap-4">
          <AppIcon name={WEATHER_ICONS[weather.icon]} className="w-20 h-20 text-white" />
          <div>
            <div className="text-6xl font-bold text-white leading-tight">
              {displayTemp}{tempUnit}
            </div>
            <div className="text-lg text-white/70 capitalize">
              {weather.condition.replace(/-/g, ' ')}
            </div>
          </div>
        </div>

        {/* Details */}
        {showDetails && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-base text-white/60">
            <div className="flex items-center gap-1.5">
              <AppIcon name="droplets" className="w-4 h-4" />
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AppIcon name="wind" className="w-4 h-4" />
              <span>{weather.wind} {windUnit}</span>
            </div>
            {weather.pressure != null && (
              <div className="flex items-center gap-1.5">
                <AppIcon name="gauge" className="w-4 h-4" />
                <span>{weather.pressure} hPa</span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 text-sm text-red-400 truncate">
            {error}
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && !error && (
          <div className="mt-2 text-sm text-white/40">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

// Register the widget
registerWidget({
  type: 'weather',
  name: 'Weather',
  description: 'Display current weather conditions',
  icon: 'weather',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: Weather,
  OptionsComponent: WeatherOptions,
  defaultProps: {
    location: 'Campus',
    units: 'fahrenheit',
    showDetails: true,
    apiKey: '',
    dataSource: 'openweathermap',
    refreshInterval: 10,
    corsProxy: '',
  },
});
