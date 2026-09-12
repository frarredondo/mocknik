import type { FillScope } from '../../domain/types';

/** Minimal structural view of `chrome.commands`. */
export interface ChromeCommandsLike {
  onCommand: { addListener(listener: (command: string) => void): void };
}

/** Keyboard command ids mapped to the scope each one fills. */
export const COMMAND_SCOPES: Readonly<Record<string, FillScope>> = {
  fill_all_inputs: 'all',
  fill_this_form: 'form',
  fill_this_input: 'focused',
};

/** Routes keyboard shortcuts to `onScope`, ignoring unknown commands. */
export function createCommands(
  commands: ChromeCommandsLike,
  onScope: (scope: FillScope) => void,
): void {
  commands.onCommand.addListener((command) => {
    const scope = COMMAND_SCOPES[command];
    if (scope) onScope(scope);
  });
}
