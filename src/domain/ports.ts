/**
 * Ports (interfaces) that the domain depends on. Adapters implement them; the
 * composition root injects them. No implementation lives here.
 */
import type { AppMessage } from './messages';
import type {
  FieldDescriptor,
  FieldType,
  FieldValue,
  FillScope,
  Settings,
} from './types';

/**
 * The only contract between the domain and a form element. Deliberately tiny:
 * it must not grow HTMLInputElement-shaped members.
 */
export interface FormField {
  readonly id: string;
  readonly descriptor: FieldDescriptor;
  read(): FieldValue;
  write(value: FieldValue): void;
}

export interface FormScanner {
  select(scope: FillScope): FormField[];
}

export interface RandomSource {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max], inclusive */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  bool(probability?: number): boolean;
}

export interface Clock {
  now(): Date;
}

export interface GenerationContext {
  readonly descriptor: FieldDescriptor;
  readonly fieldType: FieldType;
  /** Seedable source for non-secret fake data. */
  readonly random: RandomSource;
  /** Cryptographically secure source; use for passwords only. */
  readonly secureRandom: RandomSource;
  readonly clock: Clock;
}

export interface GeneratorSpec<O = undefined> {
  readonly fieldType: FieldType;
  /** Validates per-rule options. Return `undefined` to fall back to defaults. */
  readonly parseOptions?: (raw: unknown) => O | undefined;
  generate(context: GenerationContext, options: O): FieldValue;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGeneratorSpec = GeneratorSpec<any>;

export interface GeneratorRegistry {
  register<O>(spec: GeneratorSpec<O>): void;
  get(fieldType: FieldType): AnyGeneratorSpec | undefined;
}

export interface SettingsRepository {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
  subscribe(listener: (settings: Settings) => void): () => void;
}

export interface MessageBus {
  send(message: AppMessage): void;
  on<T extends AppMessage['type']>(
    type: T,
    handler: (message: Extract<AppMessage, { type: T }>) => void,
  ): () => void;
}
