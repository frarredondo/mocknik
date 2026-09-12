import { isAppMessage } from '../../domain/messages';
import type { AppMessage } from '../../domain/messages';
import type { MessageBus } from '../../domain/ports';

type ChromeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined;

/** Minimal structural view of `chrome.runtime` messaging. */
export interface ChromeRuntimeLike {
  sendMessage(message: unknown, callback?: () => void): void;
  onMessage: {
    addListener(listener: ChromeMessageListener): void;
    removeListener(listener: ChromeMessageListener): void;
  };
}

/** The chrome runtime message bus, including request/respond helpers. */
export interface ChromeMessageBus extends MessageBus {
  request(message: { type: 'GET_SETTINGS' }): Promise<unknown>;
  respond<T extends AppMessage['type']>(
    type: T,
    handler: (message: Extract<AppMessage, { type: T }>) => unknown | Promise<unknown>,
  ): () => void;
}

/** Builds a typed message bus over a runtime-like namespace. */
export function createChromeMessageBus(runtime: ChromeRuntimeLike): ChromeMessageBus {
  const listen = (listener: ChromeMessageListener): (() => void) => {
    runtime.onMessage.addListener(listener);
    return () => runtime.onMessage.removeListener(listener);
  };

  return {
    send(message) {
      try {
        const outcome = runtime.sendMessage(message, () => undefined) as unknown;
        if (outcome instanceof Promise) {
          void outcome.catch(() => undefined);
        }
      } catch {
        return;
      }
    },
    on(type, handler) {
      return listen((message) => {
        if (isAppMessage(message) && message.type === type) {
          handler(message as Extract<AppMessage, { type: typeof type }>);
        }
        return undefined;
      });
    },
    request(message) {
      return new Promise((resolve) => {
        try {
          runtime.sendMessage(message, (...args: unknown[]) => resolve(args[0]));
        } catch {
          resolve(undefined);
        }
      });
    },
    respond(type, handler) {
      return listen((message, _sender, sendResponse) => {
        if (!isAppMessage(message) || message.type !== type) return undefined;
        void Promise.resolve(handler(message as Extract<AppMessage, { type: typeof type }>)).then(
          (result) => sendResponse(result),
          () => sendResponse(undefined),
        );
        return true;
      });
    },
  };
}
