import { createChromeMessageBus } from '../adapters/chrome/messageBus';
import type { ChromeMessageBus, ChromeRuntimeLike } from '../adapters/chrome/messageBus';
import { createChromeStorageRepository } from '../adapters/chrome/storageRepository';
import type { ChromeStorageLike } from '../adapters/chrome/storageRepository';
import { createDomScanner } from '../adapters/dom/scanner';
import { createSecureRandom } from '../adapters/random/secureRandom';
import { systemClock } from '../domain/clock';
import { fill } from '../domain/fill';
import { createDefaultRegistry } from '../domain/generators/defaultRegistry';
import type {
  Clock,
  FormScanner,
  GeneratorRegistry,
  RandomSource,
  SettingsRepository,
} from '../domain/ports';
import { systemRandom } from '../domain/random';
import { createDefaultSettings } from '../domain/settings/defaults';
import type { FillReport, FillScope, Settings } from '../domain/types';

/** Ambient capabilities the content script runs against. */
export interface ContentEnv {
  readonly document: Document;
  readonly window?: Window;
}

/** The content-script object graph, built once per page. */
export interface ContentContainer {
  readonly registry: GeneratorRegistry;
  readonly random: RandomSource;
  readonly secureRandom: RandomSource;
  readonly clock: Clock;
  readonly storage: SettingsRepository;
  readonly bus: ChromeMessageBus;
  readonly scanner: FormScanner;
  getSettings(): Settings;
  setSettings(settings: Settings): void;
  fillScope(scope: FillScope): FillReport;
}

function isIgnoredUrl(href: string | undefined, domains: readonly string[]): boolean {
  if (href === undefined) {
    return false;
  }
  for (const pattern of domains) {
    try {
      if (new RegExp(pattern).test(href)) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

/** Builds the content-script composition root over a live settings cell. */
export function createContentContainer(env: ContentEnv, chromeApi: typeof chrome): ContentContainer {
  let settings = createDefaultSettings();
  const registry = createDefaultRegistry();
  const random = systemRandom;
  const secureRandom = createSecureRandom();
  const clock = systemClock;
  const storage = createChromeStorageRepository(
    chromeApi.storage as unknown as ChromeStorageLike,
  );
  const bus = createChromeMessageBus(chromeApi.runtime as unknown as ChromeRuntimeLike);
  const scanner = createDomScanner(env.document, {
    getIgnore: () => settings.ignore,
    getTriggerEvents: () => settings.defaults.triggerEvents,
  });

  return {
    registry,
    random,
    secureRandom,
    clock,
    storage,
    bus,
    scanner,
    getSettings: () => settings,
    setSettings(next) {
      settings = next;
    },
    fillScope(scope) {
      if (isIgnoredUrl(env.window?.location.href, settings.ignore.domains)) {
        return { filled: 0, skipped: 0, errors: 0 };
      }
      return fill(scope, { scanner, registry, random, secureRandom, clock, settings });
    },
  };
}
