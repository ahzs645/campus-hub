import { normalizeConfig, type DisplayConfig } from '@/lib/config';

export interface DashboardHistoryEntry {
  id: string;
  savedAt: number;
  signature: string;
  config: DisplayConfig;
}

const DB_NAME = 'campus-hub-localdb';
const DB_VERSION = 1;
const STORE_NAME = 'dashboard-history';
const FALLBACK_STORAGE_KEY = 'campus-hub:dashboard-history';
export const DASHBOARD_HISTORY_LIMIT = 5;

const sortByMostRecent = (entries: DashboardHistoryEntry[]): DashboardHistoryEntry[] =>
  [...entries].sort((a, b) => b.savedAt - a.savedAt);

export const serializeDisplayConfig = (config: DisplayConfig): string =>
  JSON.stringify(normalizeConfig(config));

const createEntryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `dashboard-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeHistoryEntry = (value: unknown): DashboardHistoryEntry | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<DashboardHistoryEntry>;
  if (typeof candidate.savedAt !== 'number' || !Number.isFinite(candidate.savedAt)) return null;
  if (!candidate.config || typeof candidate.config !== 'object') return null;

  const config = normalizeConfig(candidate.config);
  return {
    id: typeof candidate.id === 'string' && candidate.id.trim().length > 0 ? candidate.id : createEntryId(),
    savedAt: candidate.savedAt,
    signature:
      typeof candidate.signature === 'string' && candidate.signature.length > 0
        ? candidate.signature
        : serializeDisplayConfig(config),
    config,
  };
};

const readFallbackHistory = (): DashboardHistoryEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortByMostRecent(
      parsed
        .map((entry) => normalizeHistoryEntry(entry))
        .filter((entry): entry is DashboardHistoryEntry => entry !== null),
    );
  } catch {
    return [];
  }
};

const writeFallbackHistory = (entries: DashboardHistoryEntry[]): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore local storage write failures.
  }
};

const openHistoryDb = async (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return null;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open dashboard history database.'));
  });
};

const readIndexedDbHistory = async (): Promise<DashboardHistoryEntry[]> => {
  const db = await openHistoryDb();
  if (!db) return readFallbackHistory();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const entries = Array.isArray(request.result)
        ? request.result
            .map((entry) => normalizeHistoryEntry(entry))
            .filter((entry): entry is DashboardHistoryEntry => entry !== null)
        : [];
      resolve(sortByMostRecent(entries));
    };

    request.onerror = () =>
      reject(request.error ?? new Error('Failed to read dashboard history from IndexedDB.'));

    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Failed to complete dashboard history read transaction.'));
    };
  });
};

const writeIndexedDbHistory = async (entries: DashboardHistoryEntry[]): Promise<void> => {
  const db = await openHistoryDb();
  if (!db) {
    writeFallbackHistory(entries);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    store.clear();
    entries.forEach((entry) => {
      store.put(entry);
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error('Failed to complete dashboard history write transaction.'));
    };
  });
};

const readHistory = async (): Promise<DashboardHistoryEntry[]> => {
  try {
    return await readIndexedDbHistory();
  } catch {
    return readFallbackHistory();
  }
};

const writeHistory = async (entries: DashboardHistoryEntry[]): Promise<void> => {
  try {
    await writeIndexedDbHistory(entries);
  } catch {
    writeFallbackHistory(entries);
  }
};

export async function listDashboardHistory(
  limit: number = DASHBOARD_HISTORY_LIMIT,
): Promise<DashboardHistoryEntry[]> {
  const entries = await readHistory();
  return sortByMostRecent(entries).slice(0, limit);
}

export async function saveDashboardHistory(
  config: DisplayConfig,
  limit: number = DASHBOARD_HISTORY_LIMIT,
): Promise<DashboardHistoryEntry[]> {
  const normalized = normalizeConfig(config);
  const signature = serializeDisplayConfig(normalized);
  const existingEntries = await readHistory();
  const latestEntry = existingEntries[0];

  if (latestEntry?.signature === signature) {
    return existingEntries.slice(0, limit);
  }

  const nextEntries = [
    {
      id: createEntryId(),
      savedAt: Date.now(),
      signature,
      config: normalized,
    },
    ...existingEntries.filter((entry) => entry.signature !== signature),
  ].slice(0, limit);

  await writeHistory(nextEntries);
  return nextEntries;
}

export async function clearDashboardHistory(): Promise<void> {
  await writeHistory([]);
}
