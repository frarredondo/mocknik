export type StorageGetKeys =
  | string
  | readonly string[]
  | Record<string, unknown>
  | null
  | undefined;

export type StorageCallback = (items: Record<string, unknown>) => void;

export interface StorageArea {
  get(keys?: StorageGetKeys): Promise<Record<string, unknown>>;
  get(keys: StorageGetKeys, callback: StorageCallback): void;
  set(items: Record<string, unknown>): Promise<void>;
  set(items: Record<string, unknown>, callback: () => void): void;
  remove(keys: string | readonly string[]): Promise<void>;
  clear(): Promise<void>;
  /** Test-only: returns a snapshot of the underlying data. */
  __dump(): Record<string, unknown>;
  /** Test-only: seeds the underlying data. */
  __seed(items: Record<string, unknown>): void;
}

function readKeys(data: Record<string, unknown>, keys: StorageGetKeys): Record<string, unknown> {
  if (keys === null || keys === undefined) return { ...data };
  if (typeof keys === 'string') return { [keys]: data[keys] };
  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.map((key) => [key, data[key]]));
  }
  if (typeof keys === 'object') {
    const defaults = keys as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(defaults).map((key) => [key, data[key] ?? defaults[key]]),
    );
  }
  return {};
}

/** In-memory stand-in for `chrome.storage.local`, supporting promise and callback forms. */
export function createStorageArea(): StorageArea {
  const data: Record<string, unknown> = {};

  const get = (
    keys?: StorageGetKeys,
    callback?: StorageCallback,
  ): Promise<Record<string, unknown>> | void => {
    const result = readKeys(data, keys);
    if (callback) {
      callback(result);
      return;
    }
    return Promise.resolve(result);
  };

  const set = (items: Record<string, unknown>, callback?: () => void): Promise<void> | void => {
    Object.assign(data, items);
    if (callback) {
      callback();
      return;
    }
    return Promise.resolve();
  };

  const remove = (keys: string | readonly string[]): Promise<void> => {
    for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    return Promise.resolve();
  };

  const clear = (): Promise<void> => {
    for (const key of Object.keys(data)) delete data[key];
    return Promise.resolve();
  };

  return {
    get,
    set,
    remove,
    clear,
    __dump: () => ({ ...data }),
    __seed: (items) => {
      Object.assign(data, items);
    },
  } as StorageArea;
}
