import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeSettings } from '../../src/domain/settings/codec';
import { createDefaultSettings } from '../../src/domain/settings/defaults';
import type { FieldRule, Settings } from '../../src/domain/types';
import { fakeChrome } from '../setup-chrome';

const PASSWORD_OVERRIDE: FieldRule = {
  id: 'integration-password-override',
  name: 'Password override',
  match: { kind: 'exact', patterns: ['password'], attributes: ['name'] },
  fieldType: 'password',
  value: { kind: 'text', value: 'Exact-Override-1!' },
};

function withRule(settings: Settings, rule: FieldRule): Settings {
  return { ...settings, rules: [...settings.rules, rule] };
}

function isEmailShape(value: string): boolean {
  return /^[a-z0-9]+@[a-z0-9]+(\.[a-z]+)+$/i.test(value);
}

function buildForm(): {
  email: HTMLInputElement;
  password: HTMLInputElement;
  confirm: HTMLInputElement;
} {
  document.body.innerHTML = `
    <form>
      <input type="email" name="email" />
      <input type="password" name="password" />
      <input type="password" name="confirm_password" />
    </form>
  `;
  const email = document.querySelector<HTMLInputElement>('input[name="email"]');
  const password = document.querySelector<HTMLInputElement>('input[name="password"]');
  const confirm = document.querySelector<HTMLInputElement>('input[name="confirm_password"]');
  if (!email || !password || !confirm) {
    throw new Error('form fixture failed');
  }
  return { email, password, confirm };
}

async function start() {
  const { startContentScript } = await import('../../src/entry/contentScript');
  const running = startContentScript({ document, window }, fakeChrome as unknown as typeof chrome);
  await running.ready;
  return running;
}

describe('startContentScript', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    delete (window as unknown as { __anonFormFiller?: unknown }).__anonFormFiller;
  });

  it('fills all fields from stored settings when a FILL message arrives', async () => {
    const settings = withRule(createDefaultSettings(), PASSWORD_OVERRIDE);
    fakeChrome.storage.local.__seed({ settings: encodeSettings(settings) });
    const { email, password, confirm } = buildForm();

    const running = await start();

    expect(running.container.getSettings()).toEqual(settings);

    fakeChrome.runtime.onMessage.emit({ type: 'FILL', scope: 'all' }, {}, () => undefined);

    expect(isEmailShape(email.value)).toBe(true);
    expect(password.value).toBe('Exact-Override-1!');
    expect(confirm.value).toBe('Exact-Override-1!');
  });

  it('exposes window.__anonFormFiller and fills only the focused field', async () => {
    fakeChrome.storage.local.__seed({ settings: encodeSettings(createDefaultSettings()) });
    const { email, password, confirm } = buildForm();

    await start();

    const bridge = (
      window as unknown as { __anonFormFiller?: { fill(scope: string): unknown } }
    ).__anonFormFiller;
    expect(bridge).toBeDefined();

    email.focus();
    bridge?.fill('focused');

    expect(isEmailShape(email.value)).toBe(true);
    expect(password.value).toBe('');
    expect(confirm.value).toBe('');
  });

  it('applies SETTINGS_CHANGED settings to subsequent fills', async () => {
    fakeChrome.storage.local.__seed({ settings: encodeSettings(createDefaultSettings()) });
    const { email } = buildForm();

    await start();

    const settings = withRule(createDefaultSettings(), {
      id: 'integration-email-literal',
      name: 'Email literal',
      match: { kind: 'exact', patterns: ['email'], attributes: ['name'] },
      fieldType: 'email',
      value: { kind: 'text', value: 'fixed@example.org' },
    });
    fakeChrome.runtime.onMessage.emit(
      { type: 'SETTINGS_CHANGED', settings },
      {},
      () => undefined,
    );

    fakeChrome.runtime.onMessage.emit({ type: 'FILL', scope: 'all' }, {}, () => undefined);

    expect(email.value).toBe('fixed@example.org');
  });

  it('resolves ready with defaults when storage load fails', async () => {
    vi.spyOn(fakeChrome.storage.local, 'get').mockRejectedValueOnce(new Error('storage down'));
    buildForm();

    const running = await start();

    expect(running.container.getSettings()).toEqual(createDefaultSettings());
  });
});
