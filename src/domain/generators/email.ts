import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldValue } from '../types';
import { scrambledWord, TLDS } from './words';

export interface EmailOptions {
  local?: 'random' | 'list' | 'literal';
  list?: readonly string[];
  literal?: string;
  domain?: 'random' | 'list' | 'literal';
  domainList?: readonly string[];
  domainLiteral?: string;
  prefix?: string;
}

type ValueMode = 'random' | 'list' | 'literal';

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function isValueMode(value: unknown): value is ValueMode {
  return value === 'random' || value === 'list' || value === 'literal';
}

function parseStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      return undefined;
    }
    items.push(item.trim());
  }
  return items;
}

function stripLeadingAt(value: string): string {
  return value.replace(/^@/, '');
}

function parseEmailOptions(raw: unknown): EmailOptions | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const options: EmailOptions = {};
  const local = raw['local'];
  if (local !== undefined) {
    if (!isValueMode(local)) {
      return undefined;
    }
    options.local = local;
  }
  const list = raw['list'];
  if (list !== undefined) {
    const parsedList = parseStringList(list);
    if (parsedList === undefined) {
      return undefined;
    }
    options.list = parsedList;
  }
  const literal = raw['literal'];
  if (literal !== undefined) {
    if (typeof literal !== 'string') {
      return undefined;
    }
    options.literal = literal.trim();
  }
  const domain = raw['domain'];
  if (domain !== undefined) {
    if (!isValueMode(domain)) {
      return undefined;
    }
    options.domain = domain;
  }
  const domainList = raw['domainList'];
  if (domainList !== undefined) {
    const parsedList = parseStringList(domainList);
    if (parsedList === undefined) {
      return undefined;
    }
    options.domainList = parsedList.map(stripLeadingAt);
  }
  const domainLiteral = raw['domainLiteral'];
  if (domainLiteral !== undefined) {
    if (typeof domainLiteral !== 'string') {
      return undefined;
    }
    options.domainLiteral = stripLeadingAt(domainLiteral.trim());
  }
  const prefix = raw['prefix'];
  if (prefix !== undefined) {
    if (typeof prefix !== 'string') {
      return undefined;
    }
    options.prefix = prefix.trim();
  }
  if (options.local === 'list' && (options.list === undefined || options.list.length === 0)) {
    return undefined;
  }
  if (
    options.local === 'literal' &&
    (options.literal === undefined || options.literal.length === 0)
  ) {
    return undefined;
  }
  if (
    options.domain === 'list' &&
    (options.domainList === undefined || options.domainList.length === 0)
  ) {
    return undefined;
  }
  if (
    options.domain === 'literal' &&
    (options.domainLiteral === undefined || options.domainLiteral.length === 0)
  ) {
    return undefined;
  }
  return options;
}

function sanitizePart(value: string): string {
  return value.replace(/[\s@]/g, '');
}

function randomLocal(context: GenerationContext): string {
  return scrambledWord(context.random, 4, 10).toLowerCase();
}

function randomDomain(context: GenerationContext): string {
  return `${scrambledWord(context.random, 4, 10).toLowerCase()}${context.random.pick(TLDS)}`;
}

function resolveLocal(context: GenerationContext, options: EmailOptions): string {
  const mode = options.local ?? 'random';
  if (mode === 'list' && Array.isArray(options.list)) {
    const items = options.list
      .filter((item): item is string => typeof item === 'string')
      .map(sanitizePart)
      .filter((item) => item.length > 0);
    if (items.length > 0) {
      return context.random.pick(items);
    }
  }
  if (mode === 'literal' && typeof options.literal === 'string') {
    const literal = sanitizePart(options.literal);
    if (literal.length > 0) {
      return literal;
    }
  }
  return randomLocal(context);
}

function resolveDomain(context: GenerationContext, options: EmailOptions): string {
  const mode = options.domain ?? 'random';
  if (mode === 'list' && Array.isArray(options.domainList)) {
    const items = options.domainList
      .filter((item): item is string => typeof item === 'string')
      .map(sanitizePart)
      .filter((item) => item.length > 0);
    if (items.length > 0) {
      return context.random.pick(items);
    }
  }
  if (mode === 'literal' && typeof options.domainLiteral === 'string') {
    const literal = sanitizePart(options.domainLiteral);
    if (literal.length > 0) {
      return literal;
    }
  }
  return randomDomain(context);
}

function generateEmail(context: GenerationContext, options: EmailOptions): FieldValue {
  const safe = options ?? {};
  const prefix = typeof safe.prefix === 'string' ? sanitizePart(safe.prefix) : '';
  const local = resolveLocal(context, safe);
  const domain = resolveDomain(context, safe);
  return { kind: 'text', value: `${prefix}${local}@${domain}` };
}

/** Generates fake email addresses from random words, lists, or literals. */
export const emailSpec: GeneratorSpec<EmailOptions> = {
  fieldType: 'email',
  parseOptions: parseEmailOptions,
  generate(context, options) {
    return generateEmail(context, options);
  },
};
