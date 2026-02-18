export interface CacheEntry {
  value: string;
  storedAt: number;
  expiresAt: number;
}

export interface FetchCacheOptions {
  cacheKey?: string;
  ttlMs?: number;
  allowStale?: boolean;
  fetchInit?: RequestInit;
}

const CACHE_PREFIX = 'campus-hub:cache:';
const memoryCache = new Map<string, CacheEntry>();

const hashString = (input: string): string => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

export const buildCacheKey = (label: string, url: string): string =>
  `${CACHE_PREFIX}${label}:${hashString(url)}`;

const readLocalStorage = (key: string): CacheEntry | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.value !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeLocalStorage = (key: string, entry: CacheEntry): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota / storage errors
  }
};

const getCacheEntry = (key: string): CacheEntry | null => {
  const memory = memoryCache.get(key);
  if (memory) return memory;
  const stored = readLocalStorage(key);
  if (stored) {
    memoryCache.set(key, stored);
    return stored;
  }
  return null;
};

const setCacheEntry = (key: string, value: string, ttlMs: number): void => {
  const now = Date.now();
  const entry: CacheEntry = {
    value,
    storedAt: now,
    expiresAt: now + ttlMs,
  };
  memoryCache.set(key, entry);
  writeLocalStorage(key, entry);
};

export const isEntryFresh = (entry: CacheEntry): boolean => entry.expiresAt > Date.now();

/**
 * Build a proxied URL from a CORS proxy base and a target URL.
 * The proxy base can be provided in any format — the function normalizes it
 * and constructs `{base}/?url={encodedTarget}`.
 *
 * Returns the target URL unchanged when no proxy is provided.
 */
export function buildProxyUrl(corsProxy: string | undefined, targetUrl: string): string {
  if (!corsProxy) return targetUrl;

  // Normalize: strip trailing /, ?, and any partial ?url= the user may have typed
  const base = corsProxy.replace(/\/?\??(?:url=)?$/i, '');
  return `${base}/?url=${encodeURIComponent(targetUrl)}`;
}

export async function fetchTextWithCache(
  url: string,
  { cacheKey, ttlMs = 60_000, allowStale = true, fetchInit }: FetchCacheOptions = {}
): Promise<{ text: string; fromCache: boolean; stale: boolean }> {
  const key = cacheKey ?? buildCacheKey('text', url);
  const cached = getCacheEntry(key);
  if (cached && isEntryFresh(cached)) {
    return { text: cached.value, fromCache: true, stale: false };
  }

  try {
    const response = await fetch(url, fetchInit);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    const text = await response.text();
    setCacheEntry(key, text, ttlMs);
    return { text, fromCache: false, stale: false };
  } catch (error) {
    if (cached && allowStale) {
      return { text: cached.value, fromCache: true, stale: true };
    }
    throw error;
  }
}

export async function fetchJsonWithCache<T>(
  url: string,
  options: FetchCacheOptions = {}
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const { text, fromCache, stale } = await fetchTextWithCache(url, options);
  return { data: JSON.parse(text) as T, fromCache, stale };
}
