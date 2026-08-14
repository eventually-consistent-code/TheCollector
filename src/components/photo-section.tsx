/**
 * Purpose: Photo section for the item screen — grid of attachments, add
 * buttons (camera native-only, library everywhere), tap-to-arm delete.
 * Author(s): John Reed
 */

import { useQuery, usePowerSync } from '@powersync/react';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/form';
import { ItemPhoto } from '@/components/item-photo';
import { ThemedText } from '@/components/themed-text';
// Brass hairline frames around the thumbnails — framed plates in the study.
import { Palette } from '@/constants/theme';
import { deletePhoto, savePhoto } from '@/db/photos';
import { pickPhotos, takePhoto } from '@/lib/capture';

// Constants

const TILE = 96;

interface PhotoRow {
  id: string;
  local_uri: string | null;
  state: number | null;
}

export function PhotoSection({ itemId, userId }: { itemId: string; userId: string }) {
  const db = usePowerSync();
  const [busy, setBusy] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  // Photos for this item joined to their local attachment state.
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

  const onPhotoPress = async (id: string) => {
    if (armedDelete === id) {
      setArmedDelete(null);
      await deletePhoto(db, id);
    } else {
      setArmedDelete(id);
    }
  };

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.header}>
        Photos
      </ThemedText>
      <View style={styles.grid}>
        {photos?.map((photo) => (
          <Pressable key={photo.id} onPress={() => onPhotoPress(photo.id)}>
            <View style={styles.tile}>
              <ItemPhoto localUri={photo.local_uri} size={TILE} />
              {armedDelete === photo.id && (
                <View style={styles.deleteBadge}>
                  <ThemedText type="small" style={styles.deleteText}>
                    tap to delete
                  </ThemedText>
                </View>
              )}
            </View>
          </Pressable>
        ))}
        {!photos?.length && (
          <ThemedText type="small" themeColor="textSecondary">
            No photos yet.
          </ThemedText>
        )}
      </View>
      <ActionButton
        title={busy ? 'Adding…' : '+ Add from Library'}
        onPress={addFromLibrary}
        disabled={busy}
      />
      {Platform.OS !== 'web' && (
        <ActionButton
          title={busy ? 'Adding…' : '+ Take Photo'}
          onPress={addFromCamera}
          disabled={busy}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  header: { marginBottom: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  // Thin brass frame, 8px radius — clips the photo's own corners too.
  tile: {
    borderWidth: 1,
    borderColor: Palette.brass,
    borderRadius: 8,
    overflow: 'hidden',
  },
  // Semantic locals — the armed-delete overlay stays error red with white
  // text on purpose; it is a warning, not a palette moment.
  deleteBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(217,48,37,0.85)',
    alignItems: 'center',
    paddingVertical: 2,
  },
  deleteText: { color: '#fff' },
});
