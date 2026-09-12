import { describe, expect, it } from 'vitest';
import type { GeneratorSpec } from '../ports';
import type { FieldType } from '../types';
import { createRegistry } from './registry';

function numberedSpec(fieldType: FieldType, marker: number): GeneratorSpec<undefined> {
  return {
    fieldType,
    generate: () => ({ kind: 'text', value: `spec-${marker}` }),
  };
}

describe('createRegistry', () => {
  it('registers and retrieves a spec by field type', () => {
    const spec = numberedSpec('email', 1);
    const registry = createRegistry();
    registry.register(spec);
    expect(registry.get('email')).toBe(spec);
  });

  it('returns undefined for an unknown field type', () => {
    expect(createRegistry().get('password')).toBeUndefined();
  });

  it('lets the last registration win', () => {
    const first = numberedSpec('email', 1);
    const second = numberedSpec('email', 2);
    const registry = createRegistry();
    registry.register(first);
    registry.register(second);
    expect(registry.get('email')).toBe(second);
  });

  it('seeds from the provided specs', () => {
    const spec = numberedSpec('telephone', 7);
    expect(createRegistry([spec]).get('telephone')).toBe(spec);
  });

  it('lets later constructor specs win over earlier ones', () => {
    const first = numberedSpec('telephone', 1);
    const second = numberedSpec('telephone', 2);
    expect(createRegistry([first, second]).get('telephone')).toBe(second);
  });
});
