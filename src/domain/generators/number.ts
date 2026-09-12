import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldDescriptor, FieldValue } from '../types';

/** Options for the number and integer generators. */
export interface NumberOptions {
  min?: number;
  max?: number;
  decimals?: number;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validDecimals(value: unknown): number | undefined {
  const decimals = finiteNumber(value);
  if (decimals === undefined || !Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
    return undefined;
  }
  return decimals;
}

function parseNumberOptions(raw: unknown): NumberOptions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const min = finiteNumber(record['min']);
  const max = finiteNumber(record['max']);
  const decimals = validDecimals(record['decimals']);
  const options: NumberOptions = {};
  if (min !== undefined && max !== undefined && min > max) {
    options.min = max;
    options.max = min;
  } else {
    if (min !== undefined) options.min = min;
    if (max !== undefined) options.max = max;
  }
  if (decimals !== undefined) options.decimals = decimals;
  return options;
}

function descriptorNumber(descriptor: FieldDescriptor, key: 'min' | 'max'): number | undefined {
  const raw = descriptor[key];
  if (raw === undefined) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function bounds(context: GenerationContext, options: NumberOptions): readonly [number, number] {
  const min = options.min ?? descriptorNumber(context.descriptor, 'min') ?? 1;
  const max = options.max ?? descriptorNumber(context.descriptor, 'max') ?? 1000;
  return min <= max ? [min, max] : [max, min];
}

function generateNumber(
  context: GenerationContext,
  options: NumberOptions,
  integer: boolean,
): FieldValue {
  const [min, max] = bounds(context, options ?? {});
  if (integer) {
    return { kind: 'text', value: String(context.random.int(min, max)) };
  }
  const decimals = options?.decimals ?? 0;
  const factor = 10 ** decimals;
  const raw = min + context.random.next() * (max - min);
  const rounded = Math.round(raw * factor) / factor;
  const clamped = Math.min(max, Math.max(min, rounded));
  return { kind: 'text', value: String(clamped) };
}

/** Generates a decimal number within range, rounded to `decimals`. */
export const numberSpec: GeneratorSpec<NumberOptions> = {
  fieldType: 'number',
  parseOptions: parseNumberOptions,
  generate(context, options) {
    return generateNumber(context, options, false);
  },
};

/** Generates an integer within range, ignoring `decimals`. */
export const integerSpec: GeneratorSpec<NumberOptions> = {
  fieldType: 'integer',
  parseOptions: parseNumberOptions,
  generate(context, options) {
    return generateNumber(context, options, true);
  },
};
