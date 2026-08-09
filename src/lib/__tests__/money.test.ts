/**
 * Purpose: Money helper tests — dollars in, cents stored, dollars out.
 * Author(s): John Reed
 */

import { centsToDisplay, displayToCents } from '../money';

describe('displayToCents', () => {
  test.each([
    ['12.34', 1234],
    ['$12.34', 1234],
    ['12', 1200],
    ['0.05', 5],
    ['1,250.00', 125000],
    [' 8.99 ', 899],
    ['', null],
    ['abc', null],
    ['-5', null],
  ])('%p → %p', (input, expected) => {
    expect(displayToCents(input)).toBe(expected);
  });
});

describe('centsToDisplay', () => {
  test.each([
    [1234, '$12.34'],
    [5, '$0.05'],
    [120000, '$1200.00'],
    [0, '$0.00'],
  ])('%p → %p', (cents, expected) => {
    expect(centsToDisplay(cents)).toBe(expected);
  });
});
