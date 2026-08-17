/**
 * Purpose: ItemHero tests — pure paging math (offset → clamped dot index)
 * plus headless renders of all three photo-count branches: empty display
 * mount, single letterboxed plate, and the paged strip with dots. The
 * two-tap remove arming rides through the shared useItemPhotos hook.
 * Author(s): John Reed
 */

import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { heroPageFromOffset, ItemHero } from '@/components/item-hero';

// Rows the mocked watch query hands back — swapped per test.
let mockRows: { id: string; local_uri: string | null; state: number | null }[] = [];

// PowerSync context isn't running headless — stub the hook surface the
// hero (and item-photo underneath it) actually touches.
jest.mock('@powersync/react', () => ({
  usePowerSync: () => ({}),
  useQuery: () => ({ data: mockRows }),
}));

// The photo queue drags in supabase + native storage; capture drags in the
// image picker. Neither belongs in a render-shape test.
jest.mock('@/db/photos', () => ({
  getPhotoQueue: jest.fn(),
  savePhoto: jest.fn(),
  deletePhoto: jest.fn(),
}));
jest.mock('@/lib/capture', () => ({
  pickPhotos: jest.fn(async () => []),
  takePhoto: jest.fn(async () => null),
}));

// expo-image's module init wants a real native observe integration; a bare
// host element stands in fine for render-shape tests.
jest.mock('expo-image', () => {
  const mockReact = require('react');
  return { Image: (props: unknown) => mockReact.createElement('Image', props) };
});

//*************************************************************************
// Pure — paging math
//*************************************************************************

describe('heroPageFromOffset', () => {
  test('rounds the offset to the nearest page', () => {
    expect(heroPageFromOffset(0, 320, 3)).toBe(0);
    expect(heroPageFromOffset(320, 320, 3)).toBe(1);
    // Mid-drag past the halfway point counts as the next page.
    expect(heroPageFromOffset(500, 320, 3)).toBe(2);
    expect(heroPageFromOffset(460, 320, 3)).toBe(1);
  });

  test('clamps overshoot to the real photo count', () => {
    // Momentum bounce past the last page never lights a ghost dot.
    expect(heroPageFromOffset(2000, 320, 3)).toBe(2);
    expect(heroPageFromOffset(-80, 320, 3)).toBe(0);
  });

  test('degenerate inputs land safely on page zero', () => {
    expect(heroPageFromOffset(100, 0, 3)).toBe(0);
    expect(heroPageFromOffset(100, 320, 0)).toBe(0);
  });
});

//*************************************************************************
// Render — empty / single / paged branches
//*************************************************************************

const row = (id: string) => ({ id, local_uri: `file:///photos/${id}.jpg`, state: 3 });

const render = (): ReactTestRenderer => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(React.createElement(ItemHero, { itemId: 'i1', userId: 'u1' }));
  });
  return tree;
};

// onLayout never fires headless — poke the wrap's measure by hand so the
// pager (gated on a real width) mounts.
const layout = (tree: ReactTestRenderer, width: number) => {
  const wrap = tree.root.findByProps({ testID: 'item-hero' });
  act(() => {
    wrap.props.onLayout({ nativeEvent: { layout: { width } } });
  });
};

describe('ItemHero', () => {
  afterEach(() => {
    mockRows = [];
  });

  test('zero photos renders the display-mount placeholder and hint', () => {
    mockRows = [];
    const tree = render();
    expect(
      tree.root.findAllByProps({ testID: 'item-hero-placeholder' }).length
    ).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'item-hero-single' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'item-hero-dots' })).toHaveLength(0);
    act(() => tree.unmount());
  });

  test('one photo renders the single plate — no pager, no dots', () => {
    mockRows = [row('p1')];
    const tree = render();
    layout(tree, 400);
    expect(
      tree.root.findAllByProps({ testID: 'item-hero-single' }).length
    ).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'item-hero-pager' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'item-hero-dots' })).toHaveLength(0);
    act(() => tree.unmount());
  });

  test('several photos render the pager with one dot per photo', () => {
    mockRows = [row('p1'), row('p2'), row('p3')];
    const tree = render();
    layout(tree, 400);
    expect(
      tree.root.findAllByProps({ testID: 'item-hero-pager' }).length
    ).toBeGreaterThan(0);
    const dots = tree.root.findByProps({ testID: 'item-hero-dots' });
    // Dot row holds exactly one child per photo.
    expect(React.Children.count(dots.props.children)).toBe(3);
    act(() => tree.unmount());
  });

  test('remove is a two-tap dance — first tap arms, label flips', () => {
    mockRows = [row('p1')];
    const tree = render();

    // Climb from the label text to the pressable that owns it.
    const label = tree.root.findAllByProps({ children: 'Remove' })[0];
    let node = label;
    while (node.parent && !node.props.onPress) {
      node = node.parent;
    }
    act(() => {
      node.props.onPress();
    });

    expect(
      tree.root.findAllByProps({ children: 'Really remove?' }).length
    ).toBeGreaterThan(0);
    act(() => tree.unmount());
  });
});
