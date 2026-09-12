import type { GenerationContext, GeneratorSpec } from '../ports';
import type { FieldValue } from '../types';

export interface TelephoneOptions {
  template?: string;
}

const DEFAULT_TEMPLATE = '+1 (XxX) XxX-XxxX';

function isPlainObject(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw);
}

function parseTelephoneOptions(raw: unknown): TelephoneOptions | undefined {
  if (!isPlainObject(raw)) {
    return undefined;
  }
  const template = raw['template'];
  if (template === undefined) {
    return {};
  }
  if (typeof template !== 'string') {
    return undefined;
  }
  const trimmed = template.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return { template: trimmed };
}

function generateTelephone(context: GenerationContext, options: TelephoneOptions): FieldValue {
  const safe = options ?? {};
  const template =
    typeof safe.template === 'string' && safe.template.length > 0
      ? safe.template
      : DEFAULT_TEMPLATE;
  let value = '';
  for (const char of template) {
    if (char === 'X') {
      value += String(context.random.int(1, 9));
    } else if (char === 'x') {
      value += String(context.random.int(0, 9));
    } else {
      value += char;
    }
  }
  return { kind: 'text', value };
}

/** Generates telephone numbers from a placeholder template. */
export const telephoneSpec: GeneratorSpec<TelephoneOptions> = {
  fieldType: 'telephone',
  parseOptions: parseTelephoneOptions,
  generate(context, options) {
    return generateTelephone(context, options);
  },
};
