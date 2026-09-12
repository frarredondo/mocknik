/**
 * The single source of truth for messages exchanged between the service worker
 * and content scripts. Both endpoints narrow on `type`.
 */
import type { FillScope, Settings } from './types';

export type AppMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_CHANGED'; settings: Settings }
  | { type: 'FILL'; scope: FillScope };

export type AppMessageType = AppMessage['type'];

/** Used by the message bus adapter to validate incoming messages. */
export function isAppMessage(value: unknown): value is AppMessage {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return type === 'GET_SETTINGS' || type === 'SETTINGS_CHANGED' || type === 'FILL';
}
