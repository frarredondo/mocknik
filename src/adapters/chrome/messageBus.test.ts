import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import type { ChromeFake } from '../../../test/fakes/chrome';
import { createChromeMessageBus } from './messageBus';
import type { ChromeRuntimeLike } from './messageBus';

function runtimeLike(chrome: ChromeFake): ChromeRuntimeLike {
  return chrome.runtime as unknown as ChromeRuntimeLike;
}

describe('createChromeMessageBus', () => {
  it('on dispatches by type and ignores other messages', () => {
    const chrome = createChromeFake();
    const bus = createChromeMessageBus(runtimeLike(chrome));
    const onSettings = vi.fn();
    const onFill = vi.fn();
    bus.on('GET_SETTINGS', onSettings);
    bus.on('FILL', onFill);

    chrome.runtime.onMessage.emit({ type: 'GET_SETTINGS' }, {}, vi.fn());
    chrome.runtime.onMessage.emit({ type: 'FILL', scope: 'form' }, {}, vi.fn());
    chrome.runtime.onMessage.emit({ type: 'UNKNOWN' }, {}, vi.fn());
    chrome.runtime.onMessage.emit(null, {}, vi.fn());

    expect(onSettings).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledWith({ type: 'GET_SETTINGS' });
    expect(onFill).toHaveBeenCalledOnce();
    expect(onFill).toHaveBeenCalledWith({ type: 'FILL', scope: 'form' });
  });

  it('send forwards the message to the runtime', () => {
    const chrome = createChromeFake();
    const bus = createChromeMessageBus(runtimeLike(chrome));

    bus.send({ type: 'FILL', scope: 'all' });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'FILL', scope: 'all' },
      expect.any(Function),
    );
  });

  it('send swallows synchronous missing-receiver errors', () => {
    const chrome = createChromeFake();
    chrome.runtime.sendMessage.mockImplementation(() => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    });
    const bus = createChromeMessageBus(runtimeLike(chrome));

    expect(() => bus.send({ type: 'GET_SETTINGS' })).not.toThrow();
  });

  it('send swallows rejected missing-receiver promises', async () => {
    const chrome = createChromeFake();
    chrome.runtime.sendMessage.mockImplementation(() =>
      Promise.reject(new Error('Could not establish connection. Receiving end does not exist.')),
    );
    const bus = createChromeMessageBus(runtimeLike(chrome));

    bus.send({ type: 'GET_SETTINGS' });
    await Promise.resolve();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce();
  });

  it('request resolves from a respond handler', async () => {
    const chrome = createChromeFake();
    const bus = createChromeMessageBus(runtimeLike(chrome));
    bus.respond('GET_SETTINGS', () => ({ schemaVersion: 1 }));
    chrome.runtime.sendMessage.mockImplementation((...args: unknown[]) => {
      chrome.runtime.onMessage.emit(args[0], {}, args[1]);
      return Promise.resolve(undefined);
    });

    await expect(bus.request({ type: 'GET_SETTINGS' })).resolves.toEqual({ schemaVersion: 1 });
  });

  it('respond returns true and sends async results', async () => {
    const chrome = createChromeFake();
    const bus = createChromeMessageBus(runtimeLike(chrome));
    const unsubscribe = bus.respond('FILL', async () => 'filled');
    const sendResponse = vi.fn();

    const results = chrome.runtime.onMessage.emit({ type: 'FILL', scope: 'all' }, {}, sendResponse);

    expect(results).toEqual([true]);
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledWith('filled'));
    unsubscribe();
  });

  it('unsubscribe removes the listener', () => {
    const chrome = createChromeFake();
    const bus = createChromeMessageBus(runtimeLike(chrome));
    const handler = vi.fn();
    const unsubscribe = bus.on('GET_SETTINGS', handler);

    unsubscribe();
    chrome.runtime.onMessage.emit({ type: 'GET_SETTINGS' }, {}, vi.fn());

    expect(handler).not.toHaveBeenCalled();
    expect(chrome.runtime.onMessage.listenerCount()).toBe(0);
  });
});
