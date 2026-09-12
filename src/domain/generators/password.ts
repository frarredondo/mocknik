import type { GenerationContext, GeneratorSpec, RandomSource } from '../ports';
import type { FieldValue } from '../types';

export interface PasswordOptions {
  mode?: 'defined' | 'random';
  value?: string;
  length?: number;
  charset?: 'alnum' | 'ascii';
}

const ALNUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 12;
const MIN_LENGTH = 4;
const MAX_LENGTH = 128;
const ASCII_MIN = 33;
const ASCII_MAX = 126;

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function isValidLength(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_LENGTH &&
    value <= MAX_LENGTH
  );
}

function parsePasswordOptions(raw: unknown): PasswordOptions | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const options: PasswordOptions = { mode: 'random' };
  const mode = raw['mode'];
  if (mode !== undefined) {
    if (mode !== 'defined' && mode !== 'random') {
      return undefined;
    }
    options.mode = mode;
  }
  const value = raw['value'];
  if (value !== undefined) {
    if (typeof value !== 'string') {
      return undefined;
    }
    options.value = value;
  }
  const length = raw['length'];
  if (length !== undefined) {
    if (!isValidLength(length)) {
      return undefined;
    }
    options.length = length;
  }
  const charset = raw['charset'];
  if (charset !== undefined) {
    if (charset !== 'alnum' && charset !== 'ascii') {
      return undefined;
    }
    options.charset = charset;
  }
  if (options.mode === 'defined' && (options.value === undefined || options.value.length === 0)) {
    return undefined;
  }
  return options;
}

function randomChar(secureRandom: RandomSource, charset: 'alnum' | 'ascii'): string {
  if (charset === 'ascii') {
    return String.fromCharCode(secureRandom.int(ASCII_MIN, ASCII_MAX));
  }
  return ALNUM.charAt(secureRandom.int(0, ALNUM.length - 1));
}

function generatePassword(context: GenerationContext, options: PasswordOptions): FieldValue {
  const safe = options ?? {};
  if (safe.mode === 'defined' && typeof safe.value === 'string' && safe.value.length > 0) {
    return { kind: 'text', value: safe.value };
  }
  const length = isValidLength(safe.length) ? safe.length : DEFAULT_LENGTH;
  const charset = safe.charset === 'ascii' ? 'ascii' : 'alnum';
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += randomChar(context.secureRandom, charset);
  }
  return { kind: 'text', value };
}

/** Generates passwords from a defined literal or a cryptographically secure source. */
export const passwordSpec: GeneratorSpec<PasswordOptions> = {
  fieldType: 'password',
  parseOptions: parsePasswordOptions,
  generate(context, options) {
    return generatePassword(context, options);
  },
};
