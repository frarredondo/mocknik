import type { FormField, FormScanner } from '../../domain/ports';
import type { FillScope, IgnoreSettings } from '../../domain/types';
import { toDescriptor } from './descriptor';
import { createDomField } from './formField';

/** Supplies the current ignore settings to the scanner. */
export interface DomScannerOptions {
  readonly getIgnore: () => IgnoreSettings;
  /** When omitted, writes dispatch synthetic events. */
  readonly getTriggerEvents?: () => boolean;
}

const FIELD_SELECTOR = 'input, textarea, select, [contenteditable]';

function isRadio(element: Element): boolean {
  return element.tagName.toLowerCase() === 'input' && (element as HTMLInputElement).type === 'radio';
}

function radioGroupChecked(input: HTMLInputElement): boolean {
  if (input.checked) {
    return true;
  }
  if (input.name === '') {
    return false;
  }
  const radios = input.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]');
  return Array.from(radios).some((radio) => radio.name === input.name && radio.checked);
}

function hasCurrentContent(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (input.type === 'checkbox') {
      return input.checked;
    }
    if (input.type === 'radio') {
      return radioGroupChecked(input);
    }
    return input.value !== '';
  }
  if (tag === 'textarea') {
    return (element as HTMLTextAreaElement).value !== '';
  }
  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    return select.multiple ? select.selectedOptions.length > 0 : select.value !== '';
  }
  return (element.textContent ?? '') !== '';
}

function isEligible(element: Element, ignore: IgnoreSettings): boolean {
  const descriptor = toDescriptor(element);
  if (descriptor.disabled || descriptor.readonly) {
    return false;
  }
  if (ignore.types.includes(descriptor.type) || ignore.types.includes(descriptor.tag)) {
    return false;
  }
  if (ignore.hidden && descriptor.hidden) {
    return false;
  }
  if (ignore.withContent && hasCurrentContent(element)) {
    return false;
  }
  return true;
}

function dedupeRadioGroups(elements: readonly Element[]): Element[] {
  const seen = new Set<string>();
  const result: Element[] = [];
  for (const element of elements) {
    if (isRadio(element)) {
      const name = (element as HTMLInputElement).name;
      if (name !== '') {
        if (seen.has(name)) {
          continue;
        }
        seen.add(name);
      }
    }
    result.push(element);
  }
  return result;
}

function elementsFor(document: Document, scope: FillScope): Element[] {
  if (scope === 'all') {
    return Array.from(document.querySelectorAll(FIELD_SELECTOR));
  }
  const active = document.activeElement;
  if (!active) {
    return [];
  }
  if (scope === 'focused') {
    return active.matches(FIELD_SELECTOR) ? [active] : [];
  }
  const form = active.closest('form');
  if (!form) {
    return [];
  }
  return Array.from(form.querySelectorAll(FIELD_SELECTOR));
}

/** Creates a `FormScanner` that reads eligible form controls out of a document. */
export function createDomScanner(document: Document, options: DomScannerOptions): FormScanner {
  return {
    select(scope: FillScope): FormField[] {
      const ignore = options.getIgnore();
      const eligible = elementsFor(document, scope).filter((element) => isEligible(element, ignore));
      const ordered = scope === 'focused' ? eligible : dedupeRadioGroups(eligible);
      return ordered.map((element, index) => ({
        ...createDomField(element, { triggerEvents: options.getTriggerEvents?.() ?? true }),
        id: `field-${index}`,
      }));
    },
  };
}
