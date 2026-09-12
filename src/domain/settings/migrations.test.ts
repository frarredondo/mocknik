import { describe, expect, it, vi } from 'vitest';
import { MIGRATIONS, migrate } from './migrations';
import type { Migration } from './migrations';

describe('migrate', () => {
  it('ships no migrations for schema v1', () => {
    expect(MIGRATIONS).toHaveLength(0);
  });

  it('returns an equal but non-identical clone when nothing applies', () => {
    const raw = { schemaVersion: 1, payload: { nested: [1, 2, 3] } };
    const result = migrate(raw);
    expect(result).toEqual(raw);
    expect(result).not.toBe(raw);
  });

  it('runs custom migrations in ascending target order', () => {
    const order: number[] = [];
    const migrations: readonly Migration[] = [
      {
        to: 2,
        migrate: (previous) => {
          order.push(2);
          return { ...(previous as Record<string, unknown>), two: true };
        },
      },
      {
        to: 1,
        migrate: (previous) => {
          order.push(1);
          return { ...(previous as Record<string, unknown>), one: true };
        },
      },
    ];
    const result = migrate({ schemaVersion: 0 }, migrations) as Record<string, unknown>;
    expect(order).toEqual([1, 2]);
    expect(result.schemaVersion).toBe(2);
    expect(result.one).toBe(true);
    expect(result.two).toBe(true);
  });

  it('sets schemaVersion to the target after each migration', () => {
    let seen: unknown = undefined;
    const migrations: readonly Migration[] = [
      { to: 1, migrate: (previous) => ({ ...(previous as Record<string, unknown>) }) },
      {
        to: 2,
        migrate: (previous) => {
          seen = (previous as Record<string, unknown>).schemaVersion;
          return previous;
        },
      },
    ];
    const result = migrate({ schemaVersion: 0 }, migrations) as Record<string, unknown>;
    expect(seen).toBe(1);
    expect(result.schemaVersion).toBe(2);
  });

  it('skips migrations at or below the stored version', () => {
    const one = vi.fn((previous: unknown) => ({ ...(previous as Record<string, unknown>), one: true }));
    const two = vi.fn((previous: unknown) => ({ ...(previous as Record<string, unknown>), two: true }));
    const result = migrate(
      { schemaVersion: 1 },
      [
        { to: 1, migrate: one },
        { to: 2, migrate: two },
      ],
    ) as Record<string, unknown>;
    expect(one).not.toHaveBeenCalled();
    expect(two).toHaveBeenCalledTimes(1);
    expect(result.schemaVersion).toBe(2);
  });

  it('treats a missing or non-numeric schemaVersion as version 0', () => {
    const calls: number[] = [];
    const migrations: readonly Migration[] = [
      {
        to: 1,
        migrate: (previous) => {
          calls.push(1);
          return previous;
        },
      },
    ];
    migrate({}, migrations);
    migrate({ schemaVersion: 'nope' }, migrations);
    migrate({ schemaVersion: Number.NaN }, migrations);
    expect(calls).toEqual([1, 1, 1]);
  });

  it('passes through non-plain-object input unchanged', () => {
    const array = [1, 2, 3];
    expect(migrate(null)).toBe(null);
    expect(migrate(undefined)).toBe(undefined);
    expect(migrate(42)).toBe(42);
    expect(migrate('text')).toBe('text');
    expect(migrate(true)).toBe(true);
    expect(migrate(array)).toBe(array);
  });

  it('does not mutate the input', () => {
    const raw = { schemaVersion: 0, nested: { value: 1 } };
    const migrations: readonly Migration[] = [
      {
        to: 1,
        migrate: (previous) => {
          const record = previous as { touched?: boolean; nested: { value: number } };
          record.touched = true;
          record.nested.value = 99;
          return record;
        },
      },
    ];
    const result = migrate(raw, migrations) as Record<string, unknown>;
    expect(raw).toEqual({ schemaVersion: 0, nested: { value: 1 } });
    expect(result.schemaVersion).toBe(1);
    expect(result.touched).toBe(true);
    expect((result.nested as { value: number }).value).toBe(99);
  });

  it('lets a throwing migration propagate to the caller', () => {
    const migrations: readonly Migration[] = [
      {
        to: 1,
        migrate: () => {
          throw new Error('boom');
        },
      },
    ];
    expect(() => migrate({ schemaVersion: 0 }, migrations)).toThrow('boom');
  });
});
