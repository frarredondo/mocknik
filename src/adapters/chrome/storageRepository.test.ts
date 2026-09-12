import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import type { ChromeFake } from '../../../test/fakes/chrome';
import { encodeSettings } from '../../domain/settings/codec';
import { createDefaultSettings } from '../../domain/settings/defaults';
import type { Settings } from '../../domain/types';
import { createChromeStorageRepository } from './storageRepository';
import type { ChromeStorageLike } from './storageRepository';

function storageLike(chrome: ChromeFake): ChromeStorageLike {
  return chrome.storage as unknown as ChromeStorageLike;
}

function modifiedSettings(): Settings {
  const defaults = createDefaultSettings();
  return {
    ...defaults,
    defaults: { ...defaults.defaults, defaultMaxLength: 42 },
  };
}

describe('createChromeStorageRepository', () => {
  it('round-trips settings through storage', async () => {
    const chrome = createChromeFake();
    const repository = createChromeStorageRepository(storageLike(chrome));
    const settings = modifiedSettings();

    await repository.save(settings);

    await expect(repository.load()).resolves.toEqual(settings);
  });

  it('falls back to defaults for a malformed stored blob', async () => {
    const chrome = createChromeFake();
    chrome.storage.local.__seed({ settings: { schemaVersion: 'nope' } });
    const repository = createChromeStorageRepository(storageLike(chrome));

    await expect(repository.load()).resolves.toEqual(createDefaultSettings());
  });

  it('writes a migrated blob back to storage', async () => {
    const chrome = createChromeFake();
    chrome.storage.local.__seed({ settings: { schemaVersion: 0 } });
    const migration = { to: 1, migrate: () => createDefaultSettings() };
    const repository = createChromeStorageRepository(storageLike(chrome), [migration]);

    const settings = await repository.load();

    expect(settings).toEqual(createDefaultSettings());
    expect(chrome.storage.local.__dump()['settings']).toEqual(encodeSettings(createDefaultSettings()));
  });

  it('save writes encoded settings under the settings key', async () => {
    const chrome = createChromeFake();
    const repository = createChromeStorageRepository(storageLike(chrome));
    const settings = modifiedSettings();

    await repository.save(settings);

    expect(chrome.storage.local.__dump()).toEqual({ settings: encodeSettings(settings) });
  });

  it('subscribe fires on settings changes and ignores other keys', () => {
    const chrome = createChromeFake();
    const repository = createChromeStorageRepository(storageLike(chrome));
    const listener = vi.fn();
    repository.subscribe(listener);

    chrome.storage.onChanged.emit({ unrelated: { newValue: 1 } }, 'local');
    expect(listener).not.toHaveBeenCalled();

    const settings = modifiedSettings();
    chrome.storage.onChanged.emit({ settings: { newValue: encodeSettings(settings) } }, 'local');
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(settings);
  });

  it('unsubscribe stops delivery', () => {
    const chrome = createChromeFake();
    const repository = createChromeStorageRepository(storageLike(chrome));
    const listener = vi.fn();
    const unsubscribe = repository.subscribe(listener);

    unsubscribe();
    chrome.storage.onChanged.emit(
      { settings: { newValue: encodeSettings(createDefaultSettings()) } },
      'local',
    );

    expect(listener).not.toHaveBeenCalled();
  });
});
