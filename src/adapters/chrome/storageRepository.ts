import { decodeSettings, encodeSettings } from '../../domain/settings/codec';
import type { Migration } from '../../domain/settings/migrations';
import type { SettingsRepository } from '../../domain/ports';

type StorageChange = { newValue?: unknown };

type StorageChangedListener = (
  changes: Record<string, StorageChange>,
  areaName: string,
) => void;

/** Minimal structural view of a `chrome.storage`-like namespace. */
export interface ChromeStorageLike {
  local: ChromeStorageAreaLike;
  onChanged: ChromeStorageOnChangedLike;
}

/** Minimal structural view of a storage area such as `chrome.storage.local`. */
export interface ChromeStorageAreaLike {
  get(
    keys: string | readonly string[] | Record<string, unknown> | null,
  ): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/** Minimal structural view of the `chrome.storage.onChanged` event. */
export interface ChromeStorageOnChangedLike {
  addListener(callback: StorageChangedListener): void;
  removeListener?(callback: StorageChangedListener): void;
}

/** Persists settings under the `settings` key and mirrors change events. */
export function createChromeStorageRepository(
  storage: ChromeStorageLike,
  migrations?: readonly Migration[],
): SettingsRepository {
  const read = async (): Promise<ReturnType<typeof decodeSettings>> => {
    const stored = await storage.local.get('settings');
    return decodeSettings(stored['settings'], migrations);
  };

  return {
    async load() {
      const decoded = await read();
      if (decoded.migrated) {
        await storage.local.set({ settings: encodeSettings(decoded.settings) });
      }
      return decoded.settings;
    },
    async save(settings) {
      await storage.local.set({ settings: encodeSettings(settings) });
    },
    subscribe(listener) {
      const handleChange: StorageChangedListener = (changes) => {
        const change = changes['settings'];
        if (!change) return;
        listener(decodeSettings(change.newValue, migrations).settings);
      };
      storage.onChanged.addListener(handleChange);
      return () => {
        storage.onChanged.removeListener?.(handleChange);
      };
    },
  };
}
