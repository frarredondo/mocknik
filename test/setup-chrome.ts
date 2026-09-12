import { beforeEach } from 'vitest';
import { createChromeFake, type ChromeFake } from './fakes/chrome';

/**
 * Live binding: tests can `import { fakeChrome } from '../setup-chrome'` and
 * always see the fake installed for the current test.
 */
export let fakeChrome: ChromeFake = createChromeFake();

beforeEach(() => {
  fakeChrome = createChromeFake();
  (globalThis as unknown as Record<string, unknown>)['chrome'] = fakeChrome;
});
