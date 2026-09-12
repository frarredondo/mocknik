import type { Clock, FormField, FormScanner, GeneratorRegistry, RandomSource } from './ports';
import { layersFromSettings, resolveField } from './resolve';
import type { FieldValue, FillReport, FillScope, Settings } from './types';

export interface FillDeps {
  readonly scanner: FormScanner;
  readonly registry: GeneratorRegistry;
  readonly random: RandomSource;
  readonly secureRandom: RandomSource;
  readonly clock: Clock;
  readonly settings: Settings;
}

/** Extracts the text-ish form of a value for mirroring; `undefined` otherwise. */
function textOf(value: FieldValue): string | undefined {
  switch (value.kind) {
    case 'text':
    case 'choice':
      return value.value;
    case 'multiChoice':
      return value.value.join(',');
    default:
      return undefined;
  }
}

/**
 * Resolves and writes every field selected by the scope. Never throws; failures
 * are reported as counts and never stop the remaining fields.
 */
export function fill(scope: FillScope, deps: FillDeps): FillReport {
  let filled = 0;
  let skipped = 0;
  let errors = 0;
  let previousText: string | undefined;
  let previousPassword: string | undefined;

  try {
    const layers = layersFromSettings(deps.settings);
    const fields = deps.scanner.select(scope);

    for (const field of fields) {
      try {
        const resolution = resolveField(
          field,
          layers,
          deps.registry,
          deps.random,
          deps.secureRandom,
          deps.clock,
        );

        if (resolution.action === 'skip') {
          skipped += 1;
          continue;
        }

        if (resolution.action === 'mirror') {
          const source =
            resolution.mirrorSource === 'previous-password' ? previousPassword : previousText;
          if (source === undefined || source.length === 0) {
            skipped += 1;
            continue;
          }
          field.write({ kind: 'text', value: source });
          filled += 1;
          continue;
        }

        field.write(resolution.value);
        if (resolution.value.kind !== 'none') {
          filled += 1;
        }
        const text = textOf(resolution.value);
        if (text !== undefined) {
          previousText = text;
          if (resolution.fieldType === 'password') {
            previousPassword = text;
          }
        }
      } catch {
        errors += 1;
      }
    }
  } catch {
    errors += 1;
  }

  return { filled, skipped, errors };
}
