import type { FormField } from '../../domain/ports';
import type { FieldDescriptor, FieldValue } from '../../domain/types';
import { toDescriptor } from './descriptor';

/** Controls whether `write` dispatches DOM events. */
export interface DomFieldOptions {
  readonly triggerEvents: boolean;
}

function dispatch(element: Element, type: string): void {
  element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
}

function setNativeValue(element: Element, value: string): void {
  const prototype =
    element.tagName.toLowerCase() === 'textarea'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    (element as HTMLInputElement).value = value;
  }
}

function readValue(element: Element): FieldValue {
  const tag = element.tagName.toLowerCase();
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    if (input.type === 'checkbox' || input.type === 'radio') {
      return { kind: 'checked', value: input.checked };
    }
    return { kind: 'text', value: input.value };
  }
  if (tag === 'textarea') {
    return { kind: 'text', value: (element as HTMLTextAreaElement).value };
  }
  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    if (select.multiple) {
      return {
        kind: 'multiChoice',
        value: Array.from(select.selectedOptions).map((option) => option.value),
      };
    }
    return { kind: 'choice', value: select.value };
  }
  return {
    kind: 'text',
    value:
      (element as HTMLInputElement | HTMLTextAreaElement).value ?? element.textContent ?? '',
  };
}

function writeChecked(input: HTMLInputElement, value: FieldValue, triggerEvents: boolean): void {
  if (value.kind !== 'checked' || input.checked === value.value) {
    return;
  }
  input.click();
  if (input.checked !== value.value) {
    input.checked = value.value;
    if (triggerEvents) {
      dispatch(input, 'change');
    }
  }
}

function writeRadioChoice(input: HTMLInputElement, value: string, triggerEvents: boolean): void {
  if (input.name === '') {
    return;
  }
  const target = Array.from(
    input.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
  ).find((radio) => radio.name === input.name && !radio.disabled && radio.value === value);
  if (target) {
    writeChecked(target, { kind: 'checked', value: true }, triggerEvents);
  }
}

function findEnabledOption(select: HTMLSelectElement, value: string): HTMLOptionElement | undefined {
  return Array.from(select.options).find((option) => !option.disabled && option.value === value);
}

function writeSelect(select: HTMLSelectElement, value: FieldValue, triggerEvents: boolean): void {
  if (value.kind !== 'choice' && value.kind !== 'multiChoice' && value.kind !== 'text') {
    return;
  }
  const before = Array.from(select.options).map((option) => option.selected);
  if (value.kind === 'multiChoice') {
    for (const option of Array.from(select.options)) {
      option.selected = false;
    }
    for (const wanted of value.value) {
      const option = findEnabledOption(select, wanted);
      if (option) {
        option.selected = true;
      }
    }
  } else {
    const option = findEnabledOption(select, value.value);
    if (!option) {
      return;
    }
    for (const candidate of Array.from(select.options)) {
      candidate.selected = false;
    }
    option.selected = true;
  }
  const after = Array.from(select.options).map((option) => option.selected);
  const changed = before.some((selected, index) => selected !== after[index]);
  if (changed && triggerEvents) {
    dispatch(select, 'change');
    dispatch(select, 'input');
  }
}

function writeValue(
  element: Element,
  descriptor: FieldDescriptor,
  value: FieldValue,
  triggerEvents: boolean,
): void {
  if (value.kind === 'none') {
    return;
  }
  if (descriptor.tag === 'contenteditable') {
    if (value.kind === 'text') {
      element.textContent = value.value;
      if (triggerEvents) {
        dispatch(element, 'input');
      }
    }
    return;
  }
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') {
    const input = element as HTMLInputElement;
    if (tag === 'input' && input.type === 'checkbox') {
      writeChecked(input, value, triggerEvents);
      return;
    }
    if (tag === 'input' && input.type === 'radio') {
      if (value.kind === 'checked') {
        writeChecked(input, value, triggerEvents);
      } else if (value.kind === 'choice' || value.kind === 'text') {
        writeRadioChoice(input, value.value, triggerEvents);
      }
      return;
    }
    if (value.kind === 'text') {
      setNativeValue(element, value.value);
      if (triggerEvents) {
        dispatch(element, 'input');
        dispatch(element, 'change');
        dispatch(element, 'blur');
      }
    }
    return;
  }
  if (tag === 'select') {
    writeSelect(element as HTMLSelectElement, value, triggerEvents);
  }
}

/** Wraps a DOM element behind the tiny `FormField` port. */
export function createDomField(element: Element, options: DomFieldOptions): FormField {
  const descriptor = toDescriptor(element);
  return {
    id: descriptor.id || descriptor.name || 'field',
    descriptor,
    read: () => readValue(element),
    write: (value) => writeValue(element, descriptor, value, options.triggerEvents),
  };
}
