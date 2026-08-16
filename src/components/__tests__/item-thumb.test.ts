/**
 * Purpose: ItemThumb tests — pure uri resolution (native vs web) plus a
 * headless render of both branches: placeholder diamond when there is no
 * renderable photo, framed photo path when a uri arrives.
 * Author(s): John Reed
 */

import * as React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { resolvePhotoUri } from '@/components/item-photo';
import { ItemThumb } from '@/components/item-thumb';

// item-photo reaches into the photo queue (supabase client + native
// storage) only for its web blob path — stub the whole module out.
jest.mock('@/db/photos', () => ({ getPhotoQueue: jest.fn() }));

// expo-image's module init wants a real native observe integration; a bare
// host element stands in fine for render-shape tests.
jest.mock('expo-image', () => {
  const mockReact = require('react');
  return { Image: (props: unknown) => mockReact.createElement('Image', props) };
});

//*************************************************************************
// Pure — uri resolution
//*************************************************************************

describe('resolvePhotoUri', () => {
  test('native platforms take the local uri straight', () => {
    expect(resolvePhotoUri('ios', 'file:///photos/p1.jpg', null)).toBe(
      'file:///photos/p1.jpg'
    );
    // Even a minted blob url is ignored off-web.
    expect(resolvePhotoUri('android', 'file:///photos/p1.jpg', 'blob:x')).toBe(
      'file:///photos/p1.jpg'
    );
    expect(resolvePhotoUri('ios', null, null)).toBeNull();
  });

  test('web renders only the minted blob url, never indexeddb://', () => {
    expect(resolvePhotoUri('web', 'indexeddb://p1', null)).toBeNull();
    expect(resolvePhotoUri('web', 'indexeddb://p1', 'blob:abc')).toBe('blob:abc');
  });
});

//*************************************************************************
// Render — placeholder vs photo branch
//*************************************************************************

describe('ItemThumb', () => {
  const render = (uri: string | null): ReactTestRenderer => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(React.createElement(ItemThumb, { uri }));
    });
    return tree;
  };

  test('no uri renders the placeholder diamond, no photo', () => {
    const tree = render(null);
    expect(
      tree.root.findAllByProps({ testID: 'item-thumb-placeholder' }).length
    ).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'item-thumb-photo' })).toHaveLength(0);
    act(() => tree.unmount());
  });

  test('a uri renders the framed photo path, no placeholder', () => {
    const tree = render('file:///photos/p1.jpg');
    expect(
      tree.root.findAllByProps({ testID: 'item-thumb-photo' }).length
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'item-thumb-placeholder' })
    ).toHaveLength(0);
    act(() => tree.unmount());
  });
});
