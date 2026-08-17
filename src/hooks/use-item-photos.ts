/**
 * Purpose: Shared photo-management core for an item — the live photo query
 * plus add (library/camera) and two-tap remove wiring. Extracted from
 * PhotoSection so the hero strip and the grid drive the exact same logic.
 * Author(s): John Reed
 */

import { useQuery, usePowerSync } from '@powersync/react';
import { useState } from 'react';

import { deletePhoto, savePhoto } from '@/db/photos';
import { pickPhotos, takePhoto } from '@/lib/capture';

export interface PhotoRow {
  id: string;
  local_uri: string | null;
  state: number | null;
}

// One hook, every photo behavior the item screen needs: a watch query that
// keeps the list live as attachments land, busy-guarded add flows, and the
// tap-to-arm / tap-again-to-delete dance.
export function useItemPhotos(itemId: string, userId: string) {
  const db = usePowerSync();
  const [busy, setBusy] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  // Photos for this item joined to their local attachment state. Newest
  // first — the same ordering FIRST_PHOTO_URI_SQL uses, so page one of the
  // hero is the same photo the list rows show as the thumbnail.
  const { data: photos } = useQuery<PhotoRow>(
    `SELECT p.id, a.local_uri, a.state
     FROM photos p LEFT JOIN attachments a ON a.id = p.id
     WHERE p.item_id = ? ORDER BY p.created_at DESC`,
    [itemId]
  );

  const addFromLibrary = async () => {
    setBusy(true);
    try {
      const buffers = await pickPhotos();
      for (const buf of buffers) {
        await savePhoto(db, itemId, userId, buf);
      }
    } finally {
      setBusy(false);
    }
  };

  const addFromCamera = async () => {
    setBusy(true);
    try {
      const buf = await takePhoto();
      if (buf) {
        await savePhoto(db, itemId, userId, buf);
      }
    } finally {
      setBusy(false);
    }
  };

  // First tap arms; the second tap on the same photo deletes it.
  const onPhotoPress = async (id: string) => {
    if (armedDelete === id) {
      setArmedDelete(null);
      await deletePhoto(db, id);
    } else {
      setArmedDelete(id);
    }
  };

  return { photos, busy, armedDelete, addFromLibrary, addFromCamera, onPhotoPress };
}
