import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldValue } from '../types';

/** Options for the date and time generators. */
export interface DateOptions {
  minDaysFromToday?: number;
  maxDaysFromToday?: number;
  minDate?: string;
  maxDate?: string;
  format?: string;
}

const DAY_MS = 86_400_000;
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
const DEFAULT_TIME_FORMAT = 'HH:mm';

const MONTHS_SHORT: readonly string[] = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function finiteDays(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : undefined;
}

function parseDateOptions(raw: unknown): DateOptions | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const options: DateOptions = {};
  const minDays = finiteDays(record['minDaysFromToday']);
  const maxDays = finiteDays(record['maxDaysFromToday']);
  if (minDays !== undefined) options.minDaysFromToday = minDays;
  if (maxDays !== undefined) options.maxDaysFromToday = maxDays;
  if (typeof record['minDate'] === 'string') options.minDate = record['minDate'];
  if (typeof record['maxDate'] === 'string') options.maxDate = record['maxDate'];
  if (typeof record['format'] === 'string') options.format = record['format'];
  return options;
}

function utcStartOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseDateString(value: string | undefined): Date | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function resolveRange(
  context: GenerationContext,
  options: DateOptions,
): { start: number; end: number } {
  const today = utcStartOfDay(context.clock.now());
  const minDate = parseDateString(options.minDate) ?? parseDateString(context.descriptor.min);
  const maxDate = parseDateString(options.maxDate) ?? parseDateString(context.descriptor.max);
  const start =
    minDate !== undefined
      ? utcStartOfDay(minDate)
      : options.minDaysFromToday !== undefined
        ? today + options.minDaysFromToday * DAY_MS
        : 0;
  const end =
    maxDate !== undefined
      ? utcStartOfDay(maxDate)
      : options.maxDaysFromToday !== undefined
        ? today + options.maxDaysFromToday * DAY_MS
        : today;
  return start <= end ? { start, end } : { start: end, end: start };
}

function formatDate(date: Date, format: string): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const tokens: Record<string, string> = {
    YYYY: String(year).padStart(4, '0'),
    YY: String(year % 100).padStart(2, '0'),
    MMM: MONTHS_SHORT[month] ?? '',
    MM: String(month + 1).padStart(2, '0'),
    M: String(month + 1),
    DD: String(date.getUTCDate()).padStart(2, '0'),
    D: String(date.getUTCDate()),
    HH: String(date.getUTCHours()).padStart(2, '0'),
    mm: String(date.getUTCMinutes()).padStart(2, '0'),
    H: String(date.getUTCHours()),
    m: String(date.getUTCMinutes()),
  };
  return format.replace(/YYYY|YY|MMM|MM|M|DD|D|HH|mm|H|m/g, (token) => tokens[token] ?? token);
}

/** Generates a date, forced to ISO when the descriptor is a date input. */
export const dateSpec: GeneratorSpec<DateOptions> = {
  fieldType: 'date',
  parseOptions: parseDateOptions,
  generate(context, options) {
    const safe = options ?? {};
    const today = utcStartOfDay(context.clock.now());
    const { start, end } = resolveRange(context, safe);
    const startOffset = Math.round((start - today) / DAY_MS);
    const endOffset = Math.round((end - today) / DAY_MS);
    const offset = context.random.int(
      Math.min(startOffset, endOffset),
      Math.max(startOffset, endOffset),
    );
    const picked = new Date(today + offset * DAY_MS);
    const format =
      context.descriptor.type === 'date'
        ? DEFAULT_DATE_FORMAT
        : (safe.format ?? DEFAULT_DATE_FORMAT);
    return { kind: 'text', value: formatDate(picked, format) };
  },
};

/** Generates a random time of day, formatted with `HH`/`mm` style tokens. */
export const timeSpec: GeneratorSpec<DateOptions> = {
  fieldType: 'time',
  parseOptions: parseDateOptions,
  generate(context, options) {
    const safe = options ?? {};
    const hours = context.random.int(0, 23);
    const minutes = context.random.int(0, 59);
    const moment = new Date(Date.UTC(1970, 0, 1, hours, minutes));
    return { kind: 'text', value: formatDate(moment, safe.format ?? DEFAULT_TIME_FORMAT) };
  },
};
