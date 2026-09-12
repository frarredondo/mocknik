/**
 * Pure domain types for Mocknik.
 *
 * This module must never import from `chrome`, `document`, `window`, or any adapter.
 * Everything here is plain data and type-level contracts.
 */

export const FIELD_TYPES = [
  'text',
  'paragraph',
  'firstName',
  'lastName',
  'fullName',
  'username',
  'email',
  'password',
  'telephone',
  'number',
  'integer',
  'date',
  'time',
  'url',
  'color',
  'search',
  'checkbox',
  'choice',
  'multiChoice',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const MATCH_KINDS = ['contains', 'exact', 'glob', 'regex'] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];

export const MATCH_ATTRIBUTES = [
  'name',
  'id',
  'class',
  'label',
  'placeholder',
  'ariaLabel',
  'ariaLabelledBy',
  'autocomplete',
  'title',
  'type',
] as const;
export type MatchAttribute = (typeof MATCH_ATTRIBUTES)[number];

export const DEFAULT_MATCH_ATTRIBUTES: readonly MatchAttribute[] = [
  'type',
  'name',
  'id',
  'label',
  'placeholder',
  'ariaLabel',
  'autocomplete',
];

export const RULE_ACTIONS = ['fill', 'skip', 'mirror'] as const;
export type RuleAction = (typeof RULE_ACTIONS)[number];

export const MIRROR_SOURCES = ['previous-text', 'previous-password'] as const;
export type MirrorSource = (typeof MIRROR_SOURCES)[number];

export const FILL_SCOPES = ['all', 'form', 'focused'] as const;
export type FillScope = (typeof FILL_SCOPES)[number];

/** The value a generator (or override) produces for one field. */
export type FieldValue =
  | { kind: 'text'; value: string }
  | { kind: 'checked'; value: boolean }
  | { kind: 'choice'; value: string }
  | { kind: 'multiChoice'; value: readonly string[] }
  | { kind: 'none' };

export interface FieldOption {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
}

/**
 * Plain-data view of a form element. Built by the DOM adapter, consumed by the
 * domain. Never contains an element reference.
 */
export interface FieldDescriptor {
  readonly tag: string;
  readonly type: string;
  readonly name: string;
  readonly id: string;
  readonly classes: readonly string[];
  readonly label: string;
  readonly placeholder: string;
  readonly ariaLabel: string;
  readonly ariaLabelledBy: string;
  readonly autocomplete: string;
  readonly title: string;
  readonly pattern: string;
  readonly required: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly hidden: boolean;
  readonly maxLength?: number;
  readonly min?: string;
  readonly max?: string;
  readonly step?: string;
  readonly multiple?: boolean;
  readonly options?: readonly FieldOption[];
}

export interface MatchSpec {
  readonly kind: MatchKind;
  readonly patterns: readonly string[];
  /** Defaults to the global match settings when omitted. */
  readonly attributes?: readonly MatchAttribute[];
}

export interface FieldRule {
  readonly id: string;
  readonly name: string;
  readonly match: MatchSpec;
  /** Defaults to `fill`. */
  readonly action?: RuleAction;
  /** Overrides classification when set. */
  readonly fieldType?: FieldType;
  /** Literal value; wins over `template` and the generator. */
  readonly value?: FieldValue;
  /** Alphanumeric template; applied when no literal `value` is set. */
  readonly template?: string;
  /** Generator-specific options; validated by `GeneratorSpec.parseOptions`. */
  readonly options?: Readonly<Record<string, unknown>>;
  /** Manual specificity boost added to the matcher's computed specificity. */
  readonly specificity?: number;
  /** Only meaningful when `action === 'mirror'`. */
  readonly mirrorSource?: MirrorSource;
}

/** A set of rules considered together. Layers are supplied most-specific-first. */
export interface RuleLayer {
  readonly id: string;
  readonly rules: readonly FieldRule[];
}

export interface Matcher {
  test(descriptor: FieldDescriptor): boolean;
  readonly specificity: number;
}

export interface SettingsDefaults {
  readonly defaultMaxLength: number;
  readonly triggerEvents: boolean;
}

export interface MatchSettings {
  readonly attributes: readonly MatchAttribute[];
}

export interface IgnoreSettings {
  readonly hidden: boolean;
  readonly withContent: boolean;
  readonly types: readonly string[];
  readonly domains: readonly string[];
}

/** Reserved for v1.1; always an empty array in v1. */
export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly urlMatch: string;
  readonly enabled: boolean;
  readonly rules: readonly FieldRule[];
}

export interface Settings {
  readonly schemaVersion: number;
  readonly defaults: SettingsDefaults;
  readonly match: MatchSettings;
  readonly ignore: IgnoreSettings;
  readonly rules: readonly FieldRule[];
  readonly profiles: readonly Profile[];
}

/** The outcome of applying rules to one field. */
export interface FieldResolution {
  readonly fieldType: FieldType;
  readonly action: RuleAction;
  readonly value: FieldValue;
  readonly mirrorSource?: MirrorSource;
  /** Ids of the matched rules, most-specific first. Used for tests/debugging. */
  readonly trace: readonly string[];
}

export interface FillReport {
  readonly filled: number;
  readonly skipped: number;
  readonly errors: number;
}
