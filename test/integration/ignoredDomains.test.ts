import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSettings } from '../../src/domain/settings/codec';
import { createDefaultSettings } from '../../src/domain/settings/defaults';
import type { Settings } from '../../src/domain/types';
import { fakeChrome } from '../setup-chrome';

function withIgnoredDomains(settings: Settings, domains: readonly string[]): Settings {
  return { ...settings, ignore: { ...settings.ignore, domains } };
}

async function start() {
  const { startContentScript } = await import('../../src/entry/contentScript');
  const running = startContentScript({ document, window }, fakeChrome as unknown as typeof chrome);
  await running.ready;
  return running;
}

function seedEmailInput(): HTMLInputElement {
  document.body.innerHTML = '<input type="text" name="email" />';
  const input = document.querySelector<HTMLInputElement>('input[name="email"]');
  if (!input) {
    throw new Error('input fixture failed');
  }
  return input;
}

function fillAll(): void {
  fakeChrome.runtime.onMessage.emit({ type: 'FILL', scope: 'all' }, {}, () => undefined);
}

describe('ignored domains', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    delete (window as unknown as { __anonFormFiller?: unknown }).__anonFormFiller;
  });

  it('does not fill when the current URL matches an ignored domain regex', async () => {
    const settings = withIgnoredDomains(createDefaultSettings(), ['^http://localhost']);
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    const input = seedEmailInput();

    await start();
    fillAll();

    expect(input.value).toBe('');
  });

  it('fills when ignore.domains is empty', async () => {
    const settings = withIgnoredDomains(createDefaultSettings(), []);
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    const input = seedEmailInput();

    await start();
    fillAll();

    expect(input.value).not.toBe('');
  });

  it('skips invalid regexes and still fills', async () => {
    const settings = withIgnoredDomains(createDefaultSettings(), ['[']);
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    const input = seedEmailInput();

    await start();

    expect(() => {
      fillAll();
    }).not.toThrow();
    expect(input.value).not.toBe('');
  });
});
