import { createChromeStorageRepository } from '../../adapters/chrome/storageRepository';
import type { ChromeStorageLike } from '../../adapters/chrome/storageRepository';
import { systemClock } from '../../domain/clock';
import { createDefaultRegistry } from '../../domain/generators/defaultRegistry';
import { systemRandom } from '../../domain/random';
import { createOptionsApp } from './index';

const root = document.getElementById('root');
if (root) {
  void createOptionsApp(
    root,
    createChromeStorageRepository(chrome.storage as unknown as ChromeStorageLike),
    {
      registry: createDefaultRegistry(),
      random: systemRandom,
      secureRandom: systemRandom,
      clock: systemClock,
    },
  ).mount();
}
