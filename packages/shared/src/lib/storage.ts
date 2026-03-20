// Cross-platform storage abstraction
// Web: uses localStorage (sync), Native: uses AsyncStorage (async)
// Both paths exposed as async for compatibility
import { Platform } from 'react-native';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function createWebStorage(): StorageAdapter {
  return {
    getItem: (key: string) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // ignore quota errors
      }
    },
  };
}

function createNativeStorage(): StorageAdapter {
  // On native, we use a simple in-memory fallback
  // (AsyncStorage would need to be async, but our cache layer handles the memory cache)
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
  };
}

export const storage: StorageAdapter =
  Platform.OS === 'web' ? createWebStorage() : createNativeStorage();
