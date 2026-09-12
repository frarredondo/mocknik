import type { Clock } from './ports';

/** Clock backed by the current system time. */
export const systemClock: Clock = {
  now: () => new Date(),
};
