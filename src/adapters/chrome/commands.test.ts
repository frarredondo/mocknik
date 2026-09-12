import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../../../test/fakes/chrome';
import { COMMAND_SCOPES, createCommands } from './commands';
import type { ChromeCommandsLike } from './commands';

describe('createCommands', () => {
  it('maps each command to a scope', () => {
    const chrome = createChromeFake();
    const onScope = vi.fn();
    createCommands(chrome.commands as unknown as ChromeCommandsLike, onScope);

    for (const [command, scope] of Object.entries(COMMAND_SCOPES)) {
      chrome.commands.onCommand.emit(command);
      expect(onScope).toHaveBeenLastCalledWith(scope);
    }

    expect(onScope).toHaveBeenCalledTimes(Object.keys(COMMAND_SCOPES).length);
  });

  it('ignores unknown commands', () => {
    const chrome = createChromeFake();
    const onScope = vi.fn();
    createCommands(chrome.commands as unknown as ChromeCommandsLike, onScope);

    chrome.commands.onCommand.emit('does_not_exist');

    expect(onScope).not.toHaveBeenCalled();
  });
});
