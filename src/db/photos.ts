/**
 * Purpose: Photo attachment system — the queue that keeps local photo files
 * and Supabase Storage in sync, plus the save/delete entry points screens
 * use. All alpha-API wiring is contained here on purpose (phase 4 CONTEXT).
 * Author(s): John Reed
 */

import {
  AttachmentQueue,
  AttachmentState,
  type AbstractPowerSyncDatabase,
  type AttachmentRecord,
  type RemoteStorageAdapter,
} from '@powersync/common';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/auth/client';
import { createLocalPhotoStorage } from './photos-local';

// Constants

const BUCKET = 'photos';

// Object name is always derived from the photo id — never stored.
export function photoObjectName(id: string): string {
  return `${id}.jpg`;
}

// Remote adapter — verbatim demo shape over supabase-js storage.
class SupabaseRemoteStorage implements RemoteStorageAdapter {
  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(attachment.filename, fileData, {
        contentType: attachment.mediaType ?? 'image/jpeg',
        upsert: true,
      });
    if (error) {
      throw error;
    }
  }

  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(attachment.filename);
    if (error) {
      throw error;
    }
    // Hermes Blobs have no arrayBuffer(); FileReader works everywhere.
    if (typeof data.arrayBuffer === 'function') {
      return data.arrayBuffer();
    }
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(data);
    });
  }

  async deleteFile(attachment: AttachmentRecord) {
    const { error } = await supabase.storage.from(BUCKET).remove([attachment.filename]);
    if (error) {
      throw error;
    }
  }
}

// Retry decisions — a missing remote object can never download; archive it.
export function shouldRetryDownload(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error);
  return !/not.?found|404/i.test(message);
}

let queue: AttachmentQueue | null = null;

export function getPhotoQueue(db: AbstractPowerSyncDatabase): AttachmentQueue {
  if (queue) {
    return queue;
  }
  queue = new AttachmentQueue({
    db,
    localStorage: createLocalPhotoStorage(),
    remoteStorage: new SupabaseRemoteStorage(),
    watchAttachments: async (onUpdate, signal) => {
      for await (const result of db.watch('SELECT id FROM photos', [], { signal })) {
        const rows: { id: string }[] = result.rows?._array ?? [];
        await onUpdate(rows.map((row) => ({ id: row.id, fileExtension: 'jpg' })));
      }
    },
    errorHandler: {
      onDownloadError: async (attachment, error) => {
        console.warn('photo download error', attachment.filename, String(error));
        return shouldRetryDownload(error);
      },
      onUploadError: async (attachment, error) => {
        console.warn('photo upload error', attachment.filename, String(error));
        return true;
      },
      onDeleteError: async () => true,
    },
  });
  return queue;
}

// Lifecycle — called from the sync hook.
export async function startPhotoSync(db: AbstractPowerSyncDatabase) {
  await getPhotoQueue(db).startSync();
}

export async function stopPhotoSync() {
  if (queue) {
    await queue.stopSync();
  }
}

// Saves one processed image (already resized JPEG) for an item.
export async function savePhoto(
  db: AbstractPowerSyncDatabase,
  itemId: string,
  userId: string,
  data: ArrayBuffer
): Promise<string> {
  const id = Crypto.randomUUID();
  await getPhotoQueue(db).saveFile({
    id,
    data,
    fileExtension: 'jpg',
    mediaType: 'image/jpeg',
    updateHook: async (tx, attachment) => {
      await tx.execute(
        `INSERT INTO photos (id, user_id, item_id, media_type, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [attachment.id, userId, itemId, 'image/jpeg', new Date().toISOString()]
      );
    },
  });
  return id;
}

// Deletes a photo — queue removes local + remote, hook removes the row.
export async function deletePhoto(db: AbstractPowerSyncDatabase, photoId: string) {
  await getPhotoQueue(db).deleteFile({
    id: photoId,
    updateHook: async (tx) => {
      await tx.execute(`DELETE FROM photos WHERE id = ?`, [photoId]);
    },
  });
}

export { AttachmentState };
