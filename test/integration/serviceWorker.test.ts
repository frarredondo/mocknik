import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSettings } from '../../src/domain/settings/codec';
import { createDefaultSettings } from '../../src/domain/settings/defaults';
import type { Settings } from '../../src/domain/types';
import { fakeChrome } from '../setup-chrome';

function modifiedSettings(): Settings {
  const defaults = createDefaultSettings();
  return {
    ...defaults,
    defaults: { ...defaults.defaults, defaultMaxLength: 42 },
  };
}

async function start() {
  const { startServiceWorker } = await import('../../src/entry/serviceWorker');
  const worker = startServiceWorker(fakeChrome as unknown as typeof chrome);
  await worker.ready;
  return worker;
}

describe('startServiceWorker', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates the context menus, reads storage, and fills the active tab on toolbar click', async () => {
    const getSpy = vi.spyOn(fakeChrome.storage.local, 'get');
    const settings = createDefaultSettings();
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    fakeChrome.tabs.query = vi.fn(async () => []);

    const worker = await start();

    expect(getSpy).toHaveBeenCalledWith('settings');
    expect(worker.getSettings()).toEqual(settings);
    expect(fakeChrome.contextMenus.removeAll).toHaveBeenCalledOnce();
    expect(fakeChrome.contextMenus.create.mock.calls.map(([item]) => item)).toEqual([
      { id: 'anon-filler-all', title: 'Fill all inputs', contexts: ['page', 'editable'] },
      { id: 'anon-filler-form', title: 'Fill this form', contexts: ['editable'] },
      { id: 'anon-filler-input', title: 'Fill this input', contexts: ['editable'] },
    ]);

    fakeChrome.tabs.query = vi.fn(async () => [{ id: 5 }]);
    fakeChrome.action.onClicked.emit();

    await vi.waitFor(() => {
      expect(fakeChrome.tabs.sendMessage).toHaveBeenCalledWith(
        5,
        { type: 'FILL', scope: 'all' },
        expect.any(Function),
      );
    });
  });

  it('dispatches a form fill when the keyboard command fires', async () => {
    fakeChrome.tabs.query = vi.fn(async () => [{ id: 5 }]);
    await start();

    fakeChrome.commands.onCommand.emit('fill_this_form');

    await vi.waitFor(() => {
      expect(fakeChrome.tabs.sendMessage).toHaveBeenCalledWith(
        5,
        { type: 'FILL', scope: 'form' },
        expect.any(Function),
      );
    });
  });

  it('responds to GET_SETTINGS with the current settings', async () => {
    const settings = modifiedSettings();
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    await start();

    const sendResponse = vi.fn();
    fakeChrome.runtime.onMessage.emit({ type: 'GET_SETTINGS' }, {}, sendResponse);
    await Promise.resolve();

    expect(sendResponse).toHaveBeenCalledWith(settings);
  });

  it('broadcasts SETTINGS_CHANGED to every open tab', async () => {
    const settings = modifiedSettings();
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    await start();

    fakeChrome.tabs.query = vi.fn(async () => [{ id: 5 }, { id: 7 }]);
    fakeChrome.storage.onChanged.emit(
      { settings: { newValue: encodeSettings(settings) } },
      'local',
    );

    await vi.waitFor(() => {
      expect(fakeChrome.tabs.sendMessage).toHaveBeenCalledWith(
        5,
        { type: 'SETTINGS_CHANGED', settings },
        expect.any(Function),
      );
      expect(fakeChrome.tabs.sendMessage).toHaveBeenCalledWith(
        7,
        { type: 'SETTINGS_CHANGED', settings },
        expect.any(Function),
      );
    });
  });
});
