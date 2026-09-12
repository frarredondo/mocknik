export type FakeListener = (...args: unknown[]) => unknown;

export interface FakeEvent {
  addListener(listener: FakeListener): void;
  removeListener(listener: FakeListener): void;
  hasListener(listener: FakeListener): boolean;
  /** Test-only: synchronously invokes every registered listener. */
  emit(...args: unknown[]): unknown[];
  /** Test-only: number of registered listeners. */
  listenerCount(): number;
}

/** Minimal stand-in for the Chrome extension event objects. */
export function createEvent(): FakeEvent {
  const listeners = new Set<FakeListener>();
  return {
    addListener: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
    hasListener: (listener) => listeners.has(listener),
    emit: (...args) => [...listeners].map((listener) => listener(...args)),
    listenerCount: () => listeners.size,
  };
}
