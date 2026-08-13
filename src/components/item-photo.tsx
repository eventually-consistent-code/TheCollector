/**
 * Purpose: Renders one photo attachment — file:// straight into expo-image
 * on native; on web the IndexedDB file becomes a blob URL (revoked on
 * unmount). Placeholder until the attachment reaches SYNCED/local state.
 * Author(s): John Reed
 */

import { usePowerSync } from '@powersync/react';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getPhotoQueue } from '@/db/photos';
import { useTheme } from '@/hooks/use-theme';

export function ItemPhoto({ localUri, size }: { localUri: string | null; size: number }) {
  const db = usePowerSync();
  const theme = useTheme();
  const [webUrl, setWebUrl] = useState<string | null>(null);

  // Web: indexeddb:// URIs aren't renderable — read bytes, mint a blob URL.
  useEffect(() => {
    if (Platform.OS !== 'web' || !localUri) {
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      // The queue/adapter may still be initializing at first mount — retry
      // briefly instead of silently giving up (placeholder-forever bug).
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        try {
          const buf = await getPhotoQueue(db).localStorage.readFile(localUri);
          if (cancelled) {
            return;
          }
          url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
          setWebUrl(url);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    })();
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [db, localUri]);

  const uri = Platform.OS === 'web' ? webUrl : localUri;

  if (!uri) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, backgroundColor: theme.backgroundElement },
        ]}
      >
        <ThemedText type="small" themeColor="textSecondary">
          …
        </ThemedText>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: 10 }}
      contentFit="cover"
      recyclingKey={localUri ?? undefined}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
