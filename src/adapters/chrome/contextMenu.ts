import type { FillScope } from '../../domain/types';

/** Minimal structural view of `chrome.contextMenus`. */
export interface ChromeContextMenusLike {
  removeAll(callback?: () => void): void;
  create(properties: { id: string; title: string; contexts: string[] }): void;
  onClicked: {
    addListener(listener: (info: { menuItemId?: unknown }) => void): void;
  };
}

/** Stable context menu item ids shared with the composition root. */
export const MENU_IDS = {
  all: 'anon-filler-all',
  form: 'anon-filler-form',
  input: 'anon-filler-input',
} as const;

const MENU_SCOPES: Readonly<Record<string, FillScope>> = {
  [MENU_IDS.all]: 'all',
  [MENU_IDS.form]: 'form',
  [MENU_IDS.input]: 'focused',
};

/** Wires context menu clicks and exposes a rebuild function for enable/disable. */
export function createContextMenus(
  menus: ChromeContextMenusLike,
  onScope: (scope: FillScope) => void,
): { rebuild(enabled: boolean): void } {
  menus.onClicked.addListener((info) => {
    const id = info.menuItemId;
    if (typeof id !== 'string') return;
    const scope = MENU_SCOPES[id];
    if (scope) onScope(scope);
  });

  return {
    rebuild(enabled) {
      menus.removeAll();
      if (!enabled) return;
      menus.create({ id: MENU_IDS.all, title: 'Fill all inputs', contexts: ['page', 'editable'] });
      menus.create({ id: MENU_IDS.form, title: 'Fill this form', contexts: ['editable'] });
      menus.create({ id: MENU_IDS.input, title: 'Fill this input', contexts: ['editable'] });
    },
  };
}
