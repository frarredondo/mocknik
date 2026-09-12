import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldValue } from '../types';
import { loremWords, paragraph } from './words';

export interface TextOptions {
  minWords?: number;
  maxWords?: number;
  maxLength?: number;
}

function finiteNonNegative(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

function parseTextOptions(raw: unknown): TextOptions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const options: TextOptions = {};
  const minWords = finiteNonNegative(record['minWords']);
  const maxWords = finiteNonNegative(record['maxWords']);
  const maxLength = finiteNonNegative(record['maxLength']);
  if (minWords !== undefined) options.minWords = minWords;
  if (maxWords !== undefined) options.maxWords = maxWords;
  if (maxLength !== undefined) options.maxLength = maxLength;
  return options;
}

function bounds(options: TextOptions, minDefault: number, maxDefault: number): [number, number] {
  const min = options.minWords ?? minDefault;
  const max = options.maxWords ?? maxDefault;
  return min <= max ? [min, max] : [max, min];
}

function generateText(
  context: GenerationContext,
  options: TextOptions,
  minDefault: number,
  maxDefault: number,
): FieldValue {
  const safeOptions = options ?? {};
  const [min, max] = bounds(safeOptions, minDefault, maxDefault);
  const count = context.random.int(min, max);
  const maxLength = safeOptions.maxLength ?? context.descriptor.maxLength;
  return { kind: 'text', value: loremWords(context.random, count, maxLength) };
}

export const textSpec: GeneratorSpec<TextOptions> = {
  fieldType: 'text',
  parseOptions: parseTextOptions,
  generate(context, options) {
    return generateText(context, options, 1, 3);
  },
};

export const paragraphSpec: GeneratorSpec<TextOptions> = {
  fieldType: 'paragraph',
  parseOptions: parseTextOptions,
  generate(context, options) {
    const safeOptions = options ?? {};
    const [min, max] = bounds(safeOptions, 5, 20);
    const maxLength = safeOptions.maxLength ?? context.descriptor.maxLength;
    return { kind: 'text', value: paragraph(context.random, min, max, maxLength) };
  },
};
