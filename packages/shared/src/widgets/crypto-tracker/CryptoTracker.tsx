import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WidgetComponentProps } from '../../lib/types';
import { registerWidget } from '../../lib/widget-registry';
import { useFitScale } from '../../hooks/useFitScale';
import { fetchJsonWithCache, buildCacheKey, buildProxyUrl } from '../../lib/data-cache';
import AppIcon from '../../components/AppIcon';

interface CryptoTrackerConfig {
  coins?: string[];
  refreshInterval?: number;
  showChart?: boolean;
}

interface CoinPrice {
  usd: number;
  usd_24h_change?: number;
}

type CoinGeckoResponse = Record<string, CoinPrice>;

const COIN_LABELS: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  ripple: 'XRP',
  polkadot: 'DOT',
  litecoin: 'LTC',
  avalanche: 'AVAX',
  chainlink: 'LINK',
};

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function formatChange(change: number | undefined): string {
  if (change == null) return '—';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export default function CryptoTracker({
  config,
  theme,
  corsProxy,
  width,
  height,
}: WidgetComponentProps) {
  const cc = config as CryptoTrackerConfig | undefined;
  const coins = cc?.coins ?? ['bitcoin', 'ethereum', 'solana'];
  const refreshInterval = cc?.refreshInterval ?? 5;
  const refreshMs = refreshInterval * 60 * 1000;

  const [prices, setPrices] = useState<CoinGeckoResponse>({});
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const ids = coins.join(',');
      const targetUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const fetchUrl = buildProxyUrl(corsProxy, targetUrl);
      const { data } = await fetchJsonWithCache<CoinGeckoResponse>(fetchUrl, {
        cacheKey: buildCacheKey('crypto', ids),
        ttlMs: refreshMs,
      });
      setPrices(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [coins, corsProxy, refreshMs]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [fetchData, refreshMs]);

  const designH = 80 + coins.length * 44;
  const { scale, designWidth, designHeight } = useFitScale(width, height, 320, designH);

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
          <AppIcon name="coins" size={18} color={theme.accent} />
          <Text style={[st.title, { color: theme.accent }]}>Crypto</Text>
        </View>

        {error && <Text style={st.error}>{error}</Text>}

        <View style={st.coinList}>
          {coins.map((coinId) => {
            const coinData = prices[coinId];
            const label = COIN_LABELS[coinId] ?? coinId.toUpperCase().slice(0, 5);
            const change = coinData?.usd_24h_change;
            const isPositive = change != null && change >= 0;

            return (
              <View key={coinId} style={st.coinRow}>
                <View style={st.coinInfo}>
                  <Text style={st.coinSymbol}>{label}</Text>
                  <Text
                    style={[
                      st.coinChange,
                      { color: change == null ? 'rgba(255,255,255,0.4)' : isPositive ? '#4caf50' : '#f44336' },
                    ]}
                  >
                    {formatChange(change)}
                  </Text>
                </View>
                <Text style={st.coinPrice}>
                  ${coinData ? formatPrice(coinData.usd) : '—'}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  coinList: { gap: 10 },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coinInfo: { flexDirection: 'column', gap: 2 },
  coinSymbol: { fontSize: 15, fontWeight: '700', color: 'white' },
  coinChange: { fontSize: 12 },
  coinPrice: { fontSize: 17, fontWeight: '600', color: 'white' },
  error: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  updated: { marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
});

registerWidget({
  type: 'crypto-tracker',
  name: 'Crypto Tracker',
  description: 'Track cryptocurrency prices with 24-hour change',
  icon: 'coins',
  minW: 2,
  minH: 2,
  defaultW: 3,
  defaultH: 2,
  component: CryptoTracker,
  defaultProps: {
    coins: ['bitcoin', 'ethereum', 'solana'],
    refreshInterval: 5,
    showChart: false,
  },
});
