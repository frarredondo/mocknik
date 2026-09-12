import {
  FIELD_TYPES,
  MATCH_ATTRIBUTES,
  MATCH_KINDS,
  MIRROR_SOURCES,
  RULE_ACTIONS,
} from '../types';
import type { Settings } from '../types';
import { CURRENT_SCHEMA, createDefaultSettings } from './defaults';
import { MIGRATIONS, migrate } from './migrations';
import type { Migration } from './migrations';

/** Outcome of decoding a persisted settings blob. */
export interface DecodeResult {
  readonly ok: boolean;
  readonly settings: Settings;
  readonly migrated: boolean;
}

type PlainRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function isOneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value);
}

function isStringArray(value: unknown, requireNonEmpty = false): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  if (requireNonEmpty && value.length === 0) {
    return false;
  }
  return value.every((item) => typeof item === 'string');
}

function validateMatch(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  if (!isOneOf(value.kind, MATCH_KINDS)) {
    return false;
  }
  if (!isStringArray(value.patterns, true)) {
    return false;
  }
  if (value.attributes !== undefined) {
    if (!Array.isArray(value.attributes) || !value.attributes.every((item) => isOneOf(item, MATCH_ATTRIBUTES))) {
      return false;
    }
  }
  return true;
}

function validateValue(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  switch (value.kind) {
    case 'text':
    case 'choice':
      return typeof value.value === 'string';
    case 'checked':
      return typeof value.value === 'boolean';
    case 'multiChoice':
      return isStringArray(value.value);
    case 'none':
      return true;
    default:
      return false;
  }
}

function validateRule(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (!validateMatch(value.match)) {
    return false;
  }
  if (value.action !== undefined && !isOneOf(value.action, RULE_ACTIONS)) {
    return false;
  }
  if (value.fieldType !== undefined && !isOneOf(value.fieldType, FIELD_TYPES)) {
    return false;
  }
  if (value.value !== undefined && !validateValue(value.value)) {
    return false;
  }
  if (value.template !== undefined && typeof value.template !== 'string') {
    return false;
  }
  if (value.options !== undefined && !isPlainObject(value.options)) {
    return false;
  }
  if (value.specificity !== undefined && typeof value.specificity !== 'number') {
    return false;
  }
  if (value.mirrorSource !== undefined && !isOneOf(value.mirrorSource, MIRROR_SOURCES)) {
    return false;
  }
  return true;
}

function validateProfile(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return false;
  }
  if (typeof value.urlMatch !== 'string' || typeof value.enabled !== 'boolean') {
    return false;
  }
  return Array.isArray(value.rules) && value.rules.every(validateRule);
}

function validateSettings(value: unknown): value is Settings {
  if (!isPlainObject(value) || value.schemaVersion !== CURRENT_SCHEMA) {
    return false;
  }
  const defaults = value.defaults;
  if (!isPlainObject(defaults)) {
    return false;
  }
  if (typeof defaults.defaultMaxLength !== 'number' || !(defaults.defaultMaxLength > 0)) {
    return false;
  }
  if (typeof defaults.triggerEvents !== 'boolean') {
    return false;
  }
  const match = value.match;
  if (!isPlainObject(match)) {
    return false;
  }
  if (!Array.isArray(match.attributes) || match.attributes.length === 0) {
    return false;
  }
  if (!match.attributes.every((item) => isOneOf(item, MATCH_ATTRIBUTES))) {
    return false;
  }
  const ignore = value.ignore;
  if (!isPlainObject(ignore)) {
    return false;
  }
  if (typeof ignore.hidden !== 'boolean' || typeof ignore.withContent !== 'boolean') {
    return false;
  }
  if (!isStringArray(ignore.types) || !isStringArray(ignore.domains)) {
    return false;
  }
  if (!Array.isArray(value.rules) || !value.rules.every(validateRule)) {
    return false;
  }
  return Array.isArray(value.profiles) && value.profiles.every(validateProfile);
}

function failure(): DecodeResult {
  return { ok: false, settings: createDefaultSettings(), migrated: false };
}

/** Decodes a persisted settings blob, failing closed to defaults on invalid input. */
export function decodeSettings(raw: unknown, migrations: readonly Migration[] = MIGRATIONS): DecodeResult {
  try {
    if (!isPlainObject(raw)) {
      return failure();
    }
    const version = raw.schemaVersion;
    if (typeof version !== 'number' || !Number.isFinite(version) || version < 0 || version > CURRENT_SCHEMA) {
      return failure();
    }
    let candidate: unknown = raw;
    let migrated = false;
    if (version < CURRENT_SCHEMA) {
      candidate = migrate(raw, migrations);
      migrated = true;
    }
    if (!validateSettings(candidate)) {
      return failure();
    }
    return { ok: true, settings: candidate, migrated };
  } catch {
    return failure();
  }
}

/** Returns a JSON-safe deep copy of the settings, preserving the schema version. */
export function encodeSettings(settings: Settings): unknown {
  return JSON.parse(JSON.stringify(settings)) as unknown;
}
