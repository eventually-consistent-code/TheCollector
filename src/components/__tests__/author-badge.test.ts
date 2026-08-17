/**
 * Purpose: AuthorBadge tests — the pure authorInitials rule pinned down
 * (first letters of the first two words, uppercased), plus a headless
 * render of both faces: serif monogram with a name, muted diamond without.
 * Author(s): John Reed
 */

import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AuthorBadge, authorInitials } from '@/components/author-badge';

//*************************************************************************
// Pure — monogram rule
//*************************************************************************

describe('authorInitials', () => {
  test('first letters of the first two words, uppercased', () => {
    expect(authorInitials('Ursula Le Guin')).toBe('UL');
    // Pinned rule: "J.R.R." is one word, so Tolkien lands as the second.
    expect(authorInitials('J.R.R. Tolkien')).toBe('JT');
  });

  test('single word gives a single letter', () => {
    expect(authorInitials('Homer')).toBe('H');
    expect(authorInitials('plato')).toBe('P');
  });

  test('blank and missing names give the empty monogram', () => {
    expect(authorInitials('')).toBe('');
    expect(authorInitials('   ')).toBe('');
    expect(authorInitials(undefined)).toBe('');
    expect(authorInitials(null)).toBe('');
  });

  test('unicode names keep their first mark', () => {
    expect(authorInitials('Édouard Levé')).toBe('ÉL');
    expect(authorInitials('村上 春樹')).toBe('村春');
    // Astral code points survive — no broken surrogate halves.
    expect(authorInitials('𝒜uthor')).toBe('𝒜');
  });

  test('extra whitespace between words is ignored', () => {
    expect(authorInitials('  Toni   Morrison  ')).toBe('TM');
  });
});

//*************************************************************************
// Render — monogram vs empty diamond
//*************************************************************************

describe('AuthorBadge', () => {
  const render = (name?: string | null): ReactTestRenderer => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(React.createElement(AuthorBadge, { name }));
    });
    return tree;
  };

  test('a name renders the monogram medallion, no empty mount', () => {
    const tree = render('Octavia Butler');
    expect(
      tree.root.findAllByProps({ testID: 'author-badge-monogram' }).length
    ).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'author-badge-empty' })).toHaveLength(0);
    // The initials themselves land in the tree.
    expect(tree.root.findAllByProps({ children: 'OB' }).length).toBeGreaterThan(0);
    act(() => tree.unmount());
  });

  test('no name renders the muted diamond mount, no monogram', () => {
    const tree = render(undefined);
    expect(
      tree.root.findAllByProps({ testID: 'author-badge-empty' }).length
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'author-badge-monogram' })
    ).toHaveLength(0);
    act(() => tree.unmount());
  });
});
