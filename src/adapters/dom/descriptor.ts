import type { FieldDescriptor, FieldOption } from '../../domain/types';

function attribute(element: Element, name: string): string {
  return element.getAttribute(name) ?? '';
}

function tagOf(element: Element): string {
  const contenteditable = element.getAttribute('contenteditable');
  if (contenteditable !== null && contenteditable.toLowerCase() !== 'false') {
    return 'contenteditable';
  }
  return element.tagName.toLowerCase();
}

function findLabelFor(element: Element, id: string): Element | null {
  if (id === '') {
    return null;
  }
  const labels = element.ownerDocument.querySelectorAll('label[for]');
  for (const label of Array.from(labels)) {
    if (label.getAttribute('for') === id) {
      return label;
    }
  }
  return null;
}

function labelText(element: Element, id: string): string {
  const container = findLabelFor(element, id) ?? element.closest('label');
  return (container?.textContent ?? '').trim();
}

function isReadonly(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    return (element as HTMLInputElement).readOnly;
  }
  if (tag === 'textarea') {
    return (element as HTMLTextAreaElement).readOnly;
  }
  return false;
}

function isHidden(element: Element, type: string): boolean {
  if (type === 'hidden') {
    return true;
  }
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.display === 'none' || style?.visibility === 'hidden';
}

function selectOptions(element: Element): readonly FieldOption[] | undefined {
  if (element.tagName.toLowerCase() !== 'select') {
    return undefined;
  }
  return Array.from((element as HTMLSelectElement).options).map((option) => ({
    value: option.value,
    label: (option.textContent ?? '').trim(),
    disabled: option.disabled,
  }));
}

function radioOptions(element: Element): readonly FieldOption[] | undefined {
  if (element.tagName.toLowerCase() !== 'input') {
    return undefined;
  }
  const input = element as HTMLInputElement;
  if (input.type !== 'radio' || input.name === '') {
    return undefined;
  }
  return Array.from(
    input.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  )
    .filter((radio) => radio.name === input.name)
    .map((radio) => ({
      value: radio.value,
      label: labelText(radio, radio.id),
      disabled: radio.disabled,
    }));
}

/** Converts a DOM element into the plain-data descriptor the domain consumes. */
export function toDescriptor(element: Element): FieldDescriptor {
  const type = attribute(element, 'type').toLowerCase();
  const input = element as HTMLInputElement;
  const maxLength = input.maxLength;
  const multiple = input.multiple;
  const options = selectOptions(element) ?? radioOptions(element);
  const min = element.getAttribute('min');
  const max = element.getAttribute('max');
  const step = element.getAttribute('step');
  return {
    tag: tagOf(element),
    type,
    name: attribute(element, 'name'),
    id: attribute(element, 'id'),
    classes: Array.from(element.classList),
    label: labelText(element, attribute(element, 'id')),
    placeholder: attribute(element, 'placeholder'),
    ariaLabel: attribute(element, 'aria-label'),
    ariaLabelledBy: attribute(element, 'aria-labelledby'),
    autocomplete: attribute(element, 'autocomplete'),
    title: attribute(element, 'title'),
    pattern: attribute(element, 'pattern'),
    required: element.hasAttribute('required'),
    disabled: element.hasAttribute('disabled'),
    readonly: isReadonly(element),
    hidden: isHidden(element, type),
    ...(typeof maxLength === 'number' && maxLength > 0 ? { maxLength } : {}),
    ...(min !== null ? { min } : {}),
    ...(max !== null ? { max } : {}),
    ...(step !== null ? { step } : {}),
    ...(multiple ? { multiple: true } : {}),
    ...(options ? { options } : {}),
  };
}
