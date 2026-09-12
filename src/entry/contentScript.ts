import type { FillScope } from '../domain/types';
import { createContentContainer } from './container';
import type { ContentContainer, ContentEnv } from './container';

/** Handle to a started content script: its graph plus the settings-load promise. */
export interface RunningContentScript {
  readonly container: ContentContainer;
  readonly ready: Promise<void>;
}

/** Starts the content script: loads settings, wires messages, and exposes the bridge. */
export function startContentScript(
  env: ContentEnv,
  chromeApi: typeof chrome,
): RunningContentScript {
  const container = createContentContainer(env, chromeApi);

  container.bus.on('FILL', (message) => {
    container.fillScope(message.scope);
  });
  container.bus.on('SETTINGS_CHANGED', (message) => {
    container.setSettings(message.settings);
  });

  const ready = container.storage
    .load()
    .then((settings) => {
      container.setSettings(settings);
    })
    .catch(() => undefined);

  if (env.window) {
    (env.window as unknown as { __anonFormFiller?: unknown }).__anonFormFiller = {
      fill: (scope: FillScope) => container.fillScope(scope),
    };
  }

  return { container, ready };
}
