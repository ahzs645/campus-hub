import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface ExchangeRateConfig {
  baseCurrency?: string;
  targetCurrencies?: string[];
  refreshInterval?: number;
}

interface RateResponse {
  result: string;
  conversion_rates?: Record<string, number>;
  rates?: Record<string, number>;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5', CAD: 'C$',
  AUD: 'A$', CHF: 'Fr', CNY: '\u00A5', INR: '\u20B9', MXN: 'Mex$',
  BRL: 'R$', KRW: '\u20A9', SGD: 'S$', HKD: 'HK$', SEK: 'kr',
};

const MOCK_RATES: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, JPY: 149.5, CAD: 1.36, AUD: 1.54,
  CHF: 0.88, CNY: 7.24, INR: 83.1, MXN: 17.15, BRL: 4.97,
};

function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(1);
  if (rate >= 1) return rate.toFixed(3);
  return rate.toFixed(5);
}

export default function ExchangeRate({
  config,
  theme,
  corsProxy,
  width,
  height,
}: WidgetComponentProps) {
  const ec = config as ExchangeRateConfig | undefined;
  const baseCurrency = ec?.baseCurrency ?? 'USD';
  const targetCurrencies = ec?.targetCurrencies ?? ['EUR', 'GBP', 'JPY', 'CAD'];
  const refreshInterval = ec?.refreshInterval ?? 60;
  const refreshMs = refreshInterval * 60 * 1000;

  const [rates, setRates] = useState<Record<string, number>>(MOCK_RATES);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const targetUrl = `https://open.er-api.com/v6/latest/${baseCurrency}`;
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<RateResponse>(fetchUrl, {
        cacheKey: buildCacheKey('exchange-rate', baseCurrency),
        ttlMs: refreshMs,
      });
      const rateMap = data.rates ?? data.conversion_rates;
      if (rateMap) {
        setRates(rateMap);
        setLastUpdated(new Date());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [baseCurrency, corsProxy, refreshMs]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs]);

  const { scale, designWidth, designHeight } = useFitScale(width, height, 320, 240);

  return (
    <View style={[st.container, { backgroundColor: `${theme.primary}20` }]}>
      <View
        style={{
          width: designWidth,
          height: designHeight,
          transform: [{ scale }],
          transformOrigin: 'top left',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View style={st.header}>
          <AppIcon name="arrowLeftRight" size={18} color={theme.accent} />
          <Text style={[st.title, { color: theme.accent }]}>Exchange Rates</Text>
        </View>

        <Text style={st.base}>
          {CURRENCY_SYMBOLS[baseCurrency] ?? ''} 1 {baseCurrency}
        </Text>

        {error && <Text style={st.error}>{error}</Text>}

        <View style={st.rateList}>
          {targetCurrencies.map((currency) => {
            const rate = rates[currency];
            const symbol = CURRENCY_SYMBOLS[currency] ?? '';
            return (
              <View key={currency} style={st.rateRow}>
                <Text style={st.currencyCode}>{currency}</Text>
                <View style={st.rateLine} />
                <Text style={st.rateValue}>
                  {symbol}{rate != null ? formatRate(rate) : '—'}
                </Text>
              </View>
            );
          })}
        </View>

        {lastUpdated && (
          <Text style={st.updated}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600' },
  base: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  rateList: { gap: 8 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencyCode: { fontSize: 14, fontWeight: '700', color: 'white', width: 40 },
  rateLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  rateValue: { fontSize: 16, fontWeight: '600', color: 'white' },
  error: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  updated: { marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
});

registerWidget({
  type: 'exchange-rate',
  name: 'Exchange Rate',
  description: 'Display currency exchange rates',
  icon: 'arrowLeftRight',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: ExchangeRate,
  defaultProps: {
    baseCurrency: 'USD',
    targetCurrencies: ['EUR', 'GBP', 'JPY', 'CAD'],
    refreshInterval: 60,
  },
});
