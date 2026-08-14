/**
 * Purpose: Debounce helper tests — trailing-edge timing, latest-args-win,
 * and cancel, all on fake timers.
 * Author(s): John Reed
 */

import { debounce } from '../debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('fires once on the trailing edge with the latest args', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('s');
    debounced('sw');
    debounced('swo');

    // Still inside the quiet window — nothing yet.
    jest.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('swo');
  });

  test('each call re-arms the timer', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('a');
    jest.advanceTimersByTime(200);
    debounced('ab');
    jest.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('ab');
  });

  test('cancel drops the pending call', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('doomed');
    debounced.cancel();
    jest.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  test('fires again after a completed cycle', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    debounced('one');
    jest.advanceTimersByTime(250);
    debounced('two');
    jest.advanceTimersByTime(250);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'one');
    expect(fn).toHaveBeenNthCalledWith(2, 'two');
  });

  test('cancel is a no-op with nothing pending', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 250);

    expect(() => debounced.cancel()).not.toThrow();
  });
});
