/** One settings schema migration step targeting a specific version. */
export interface Migration {
  readonly to: number;
  migrate(previous: unknown): unknown;
}

/** Shipped schema migrations; v1 has none. */
export const MIGRATIONS: readonly Migration[] = [];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Applies pending migrations to a raw settings blob without mutating the input.
 * Non-object input and migration errors are passed through to the caller.
 */
export function migrate(raw: unknown, migrations: readonly Migration[] = MIGRATIONS): unknown {
  if (!isPlainObject(raw)) {
    return raw;
  }
  const storedVersion = raw.schemaVersion;
  const startVersion =
    typeof storedVersion === 'number' && Number.isFinite(storedVersion) ? storedVersion : 0;
  const pending = [...migrations].sort((left, right) => left.to - right.to);
  let current: unknown = deepClone(raw);
  for (const migration of pending) {
    if (migration.to <= startVersion) {
      continue;
    }
    current = migration.migrate(current);
    if (isPlainObject(current)) {
      current.schemaVersion = migration.to;
    }
  }
  return current;
}
