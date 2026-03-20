import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useAdaptiveFitScale } from '../../hooks/useFitScale';
import { buildCacheKey, buildProxyUrl, fetchJsonWithCache, fetchTextWithCache } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';
import type { IconName } from '../../components/AppIcon';

type WeatherIconKey = 'sunny' | 'cloudy' | 'partly-cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'windy' | 'default';

interface WeatherData { temp: number; condition: string; icon: WeatherIconKey; humidity: number; wind: number; location: string; pressure?: number; dewPoint?: number; windDir?: number; windGust?: number; precip?: number; }
type DisplayMode = 'full' | 'temperature-only' | 'wind-only' | 'minimal' | 'custom';
interface DisplayItems { location?: boolean; icon?: boolean; temperature?: boolean; condition?: boolean; humidity?: boolean; wind?: boolean; pressure?: boolean; dewPoint?: boolean; windGust?: boolean; precipitation?: boolean; lastUpdated?: boolean; }
interface WeatherConfig { location?: string; units?: 'celsius' | 'fahrenheit'; apiKey?: string; displayMode?: DisplayMode; displayItems?: DisplayItems; dataSource?: 'openweathermap' | 'unbc-rooftop'; refreshInterval?: number; corsProxy?: string; }

const DISPLAY_MODE_PRESETS: Record<Exclude<DisplayMode, 'custom'>, DisplayItems> = {
  full: { location: true, icon: true, temperature: true, condition: true, humidity: true, wind: true, pressure: true, lastUpdated: true },
  'temperature-only': { location: true, icon: true, temperature: true, condition: true },
  'wind-only': { location: true, wind: true, windGust: true },
  minimal: { icon: true, temperature: true },
};

const resolveDisplayItems = (config: WeatherConfig | undefined): DisplayItems => {
  const mode = config?.displayMode ?? 'full';
  if (mode === 'custom') return config?.displayItems ?? DISPLAY_MODE_PRESETS.full;
  return DISPLAY_MODE_PRESETS[mode];
};

const WEATHER_ICONS: Record<WeatherIconKey, IconName> = {
  sunny: 'sun', cloudy: 'cloud', 'partly-cloudy': 'cloudSun', rainy: 'cloudRain',
  stormy: 'cloudLightning', snowy: 'snowflake', foggy: 'cloudFog', windy: 'wind', default: 'weather',
};

const MOCK_WEATHER: WeatherData = { temp: 72, condition: 'partly-cloudy', icon: 'partly-cloudy', humidity: 45, wind: 8, location: 'Campus' };

const mapWeatherIcon = (condition: string): WeatherIconKey => {
  const key = condition.toLowerCase();
  if (key.includes('clear') || key.includes('sunny')) return 'sunny';
  if (key.includes('cloud')) return 'cloudy';
  if (key.includes('rain')) return 'rainy';
  if (key.includes('storm') || key.includes('thunder')) return 'stormy';
  if (key.includes('snow')) return 'snowy';
  if (key.includes('fog') || key.includes('mist')) return 'foggy';
  if (key.includes('wind')) return 'windy';
  return 'default';
};

const UNBC_URL = 'https://cyclone.unbc.ca/wx/data-table-std-1m.html';
const deriveConditionFromUNBC = (temp: number, rh: number, windSpeed: number, precip: number, kdownTot: number): WeatherIconKey => {
  if (precip > 0 && temp <= 0) return 'snowy';
  if (precip > 0) return 'rainy';
  if (windSpeed > 10) return 'windy';
  if (rh > 95) return 'foggy';
  if (kdownTot > 300) return 'sunny';
  if (kdownTot > 100) return 'partly-cloudy';
  return 'cloudy';
};

const parseUNBCWeatherData = (html: string, units: 'celsius' | 'fahrenheit'): WeatherData | null => {
  const lines = html.split('\n');
  let lastDataLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(lines[i])) { lastDataLine = lines[i]; break; }
  }
  if (!lastDataLine) return null;
  const cells = lastDataLine.split(/<td>/i).slice(1).map(s => s.replace(/<\/td>|<\/tr>/gi, '').trim());
  if (cells.length < 13) return null;
  const tAir = parseFloat(cells[2] ?? '');
  if (isNaN(tAir)) return null;
  const tDew = parseFloat(cells[3] ?? ''); const rh = parseFloat(cells[4] ?? '');
  const pmsl = parseFloat(cells[6] ?? ''); const wspdAvg = parseFloat(cells[7] ?? '');
  const wdir = parseFloat(cells[9] ?? ''); const wgust = parseFloat(cells[11] ?? '');
  const precip = parseFloat(cells[12] ?? ''); const kdownTot = cells.length > 13 ? parseFloat(cells[13] ?? '') : 0;
  const temp = units === 'fahrenheit' ? Math.round(tAir * 9 / 5 + 32) : Math.round(tAir * 10) / 10;
  const windDisplay = units === 'fahrenheit' ? Math.round(wspdAvg * 2.23694) : Math.round(wspdAvg * 10) / 10;
  const gustDisplay = units === 'fahrenheit' ? Math.round(wgust * 2.23694) : Math.round(wgust * 10) / 10;
  const condition = deriveConditionFromUNBC(tAir, rh, wspdAvg, precip, isNaN(kdownTot) ? 0 : kdownTot);
  return { temp, condition: condition.replace(/-/g, ' '), icon: condition, humidity: Math.round(rh), wind: windDisplay, location: 'UNBC Rooftop', pressure: Math.round(pmsl * 10) / 10, dewPoint: units === 'fahrenheit' ? Math.round(tDew * 9 / 5 + 32) : Math.round(tDew * 10) / 10, windDir: Math.round(wdir), windGust: gustDisplay, precip };
};

export default function Weather({ config, theme, corsProxy: globalCorsProxy, width, height }: WidgetComponentProps) {
  const wc = config as WeatherConfig | undefined;
  const units = wc?.units ?? 'fahrenheit';
  const location = wc?.location ?? 'Campus';
  const show = resolveDisplayItems(wc);
  const apiKey = wc?.apiKey?.trim();
  const dataSource = wc?.dataSource ?? 'openweathermap';
  const refreshInterval = wc?.refreshInterval ?? 10;
  const corsProxy = wc?.corsProxy?.trim() || globalCorsProxy;
  const refreshMs = refreshInterval * 60 * 1000;

  const [weather, setWeather] = useState<WeatherData>({ ...MOCK_WEATHER, location: dataSource === 'unbc-rooftop' ? 'UNBC Rooftop' : location });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUNBC = useCallback(async () => {
    try {
      setError(null);
      const fetchUrl = buildProxyUrl(corsProxy, UNBC_URL);
      const { text } = await fetchTextWithCache(fetchUrl, { cacheKey: buildCacheKey('weather-unbc', UNBC_URL), ttlMs: refreshMs });
      const parsed = parseUNBCWeatherData(text, units);
      if (parsed) { setWeather(parsed); setLastUpdated(new Date()); }
      else setError('Failed to parse weather data');
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }, [corsProxy, units, refreshMs]);

  const fetchOWM = useCallback(async () => {
    if (!apiKey) { setWeather({ ...MOCK_WEATHER, temp: units === 'celsius' ? Math.round((MOCK_WEATHER.temp - 32) * 5 / 9) : MOCK_WEATHER.temp, location }); return; }
    try {
      const unitParam = units === 'celsius' ? 'metric' : 'imperial';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${unitParam}&appid=${apiKey}`;
      const { data } = await fetchJsonWithCache<Record<string, unknown>>(url, { cacheKey: buildCacheKey('weather', `${location}:${unitParam}`), ttlMs: refreshMs });
      const weatherArr = data?.weather as Array<Record<string, string>> | undefined;
      const condition = weatherArr?.[0]?.main ?? 'Clear';
      const description = weatherArr?.[0]?.description ?? condition;
      const windObj = data?.wind as Record<string, number> | undefined;
      const mainObj = data?.main as Record<string, number> | undefined;
      setWeather({
        temp: Math.round(mainObj?.temp ?? MOCK_WEATHER.temp),
        condition: description, icon: mapWeatherIcon(condition),
        humidity: Math.round(mainObj?.humidity ?? MOCK_WEATHER.humidity),
        wind: Math.round(windObj?.speed ?? MOCK_WEATHER.wind), location,
      });
      setLastUpdated(new Date());
    } catch { /* keep existing data */ }
  }, [apiKey, location, units, refreshMs]);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => { if (!isMounted) return; if (dataSource === 'unbc-rooftop') await fetchUNBC(); else await fetchOWM(); };
    fetchWeather();
    const interval = setInterval(fetchWeather, refreshMs);
    return () => { isMounted = false; clearInterval(interval); };
  }, [dataSource, fetchUNBC, fetchOWM, refreshMs]);

  const tempUnit = units === 'celsius' ? '°C' : '°F';
  const windUnit = units === 'celsius' ? 'm/s' : 'mph';
  const { scale, designWidth, designHeight, isLandscape } = useAdaptiveFitScale(width, height, { landscape: { w: 340, h: 260 }, portrait: { w: 240, h: 360 } });

  return (
    <View style={[st.container, { backgroundColor: `${theme.primary}20` }]}>
      <View style={{ width: designWidth, height: designHeight, transform: [{ scale }], transformOrigin: 'top left', justifyContent: 'center', padding: 24 }}>
        {show.location && <Text style={[st.location, { color: theme.accent }]}>{weather.location}</Text>}
        {(show.icon || show.temperature || show.condition) && (
          <View style={[st.mainRow, !isLandscape && { flexDirection: 'column', alignItems: 'center' }]}>
            {show.icon && <AppIcon name={WEATHER_ICONS[weather.icon]} size={isLandscape ? 64 : 80} color="white" />}
            <View style={!isLandscape ? { alignItems: 'center' } : undefined}>
              {show.temperature && <Text style={st.temp}>{weather.temp}{tempUnit}</Text>}
              {show.condition && <Text style={st.condition}>{weather.condition.replace(/-/g, ' ')}</Text>}
            </View>
          </View>
        )}
        {(show.humidity || (show.wind && show.temperature) || show.pressure || show.dewPoint || show.precipitation) && (
          <View style={[st.details, !isLandscape && { justifyContent: 'center' }]}>
            {show.humidity && (
              <View style={st.detailItem}><AppIcon name="droplets" size={16} color="rgba(255,255,255,0.6)" /><Text style={st.detailText}>{weather.humidity}%</Text></View>
            )}
            {show.wind && show.temperature && (
              <View style={st.detailItem}><AppIcon name="wind" size={16} color="rgba(255,255,255,0.6)" /><Text style={st.detailText}>{weather.wind} {windUnit}</Text></View>
            )}
            {show.pressure && weather.pressure != null && (
              <View style={st.detailItem}><AppIcon name="gauge" size={16} color="rgba(255,255,255,0.6)" /><Text style={st.detailText}>{weather.pressure} hPa</Text></View>
            )}
          </View>
        )}
        {error && <Text style={st.error}>{error}</Text>}
        {show.lastUpdated && lastUpdated && !error && (
          <Text style={st.updated}>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  location: { fontSize: 18, fontWeight: '500', opacity: 0.7, marginBottom: 4 },
  mainRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  temp: { fontSize: 48, fontWeight: '700', color: 'white' },
  condition: { fontSize: 18, color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' },
  details: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  error: { marginTop: 8, fontSize: 13, color: '#ef4444' },
  updated: { marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' },
});

registerWidget({
  type: 'weather',
  name: 'Weather',
  description: 'Display current weather conditions',
  icon: 'weather',
  minW: 2, minH: 2, defaultW: 3, defaultH: 2,
  component: Weather,
  defaultProps: { location: 'Campus', units: 'fahrenheit', displayMode: 'full', apiKey: '', dataSource: 'openweathermap', refreshInterval: 10, corsProxy: '' },
});
