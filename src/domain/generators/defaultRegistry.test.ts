import { describe, expect, it } from 'vitest';
import { FIELD_TYPES } from '../types';
import { createDefaultRegistry, missingGeneratorTypes } from './defaultRegistry';

describe('createDefaultRegistry', () => {
  it('registers a generator for every field type', () => {
    const registry = createDefaultRegistry();
    expect(missingGeneratorTypes(registry)).toEqual([]);
  });

  it('covers all field types reported by the constant', () => {
    const registry = createDefaultRegistry();
    for (const type of FIELD_TYPES) {
      expect(registry.get(type), `missing generator for ${type}`).toBeDefined();
    }
  });
});
