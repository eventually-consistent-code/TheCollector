/**
 * Purpose: Tiny trailing-edge debounce — the search screen leans on it so
 * keystrokes don't hammer the watch query. Pure timers, no react, so it
 * unit-tests standalone with fake timers.
 * Author(s): John Reed
 */

// A debounced function plus the off switch — cancel() drops any pending call.
export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
}

// Trailing-edge only: each call re-arms the timer, and fn fires once with the
// latest args after waitMs of quiet.
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: A) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
