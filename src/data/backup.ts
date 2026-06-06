// =============================================================
// 匯出 / 匯入 —— 本機資料的安全網。
// Phase 0 全部存在 IndexedDB，清瀏覽器資料 / 換機 / iOS 回收儲存都會遺失，
// 故個人中心提供「匯出」備份成單一 JSON、「匯入」還原。圖片以 base64 內嵌同一檔。
// ⚠️ 匯入為「整包還原」：會覆寫現有所有資料。
// 接後端（Phase 1+）後，雲端同步會接手大部分職責，但本功能仍可作離線備份。
// =============================================================
import { db, type Item, type Outfit, type Profile, type Listing, type WearLog } from '../db/db';

const BACKUP_VERSION = 1;

interface BackupFile {
  app: 'ootd';
  version: number;
  exportedAt: number;
  data: {
    items: Item[];
    outfits: Outfit[];
    profiles: Profile[];
    listings: Listing[];
    wearlogs: WearLog[];
  };
  images: { id: string; type: string; base64: string }[];
}

/** 匯出整櫃資料為單一 JSON Blob（含圖片）。接到「我的」頁的匯出鈕 → 下載 / 分享。 */
export async function exportAll(): Promise<Blob> {
  const [items, outfits, profiles, listings, wearlogs, images] = await Promise.all([
    db.items.toArray(),
    db.outfits.toArray(),
    db.profiles.toArray(),
    db.listings.toArray(),
    db.wearlogs.toArray(),
    db.images.toArray(),
  ]);
  const encodedImages = await Promise.all(
    images.map(async (img) => ({
      id: img.id,
      type: img.blob.type || 'image/webp',
      base64: await blobToBase64(img.blob),
    }))
  );
  const backup: BackupFile = {
    app: 'ootd',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    data: { items, outfits, profiles, listings, wearlogs },
    images: encodedImages,
  };
  return new Blob([JSON.stringify(backup)], { type: 'application/json' });
}

/** 從匯出的 JSON 還原（整包覆寫現有資料）。回傳還原筆數摘要。 */
export async function importAll(file: Blob): Promise<{ items: number; images: number }> {
  const backup = JSON.parse(await file.text()) as BackupFile;
  if (backup.app !== 'ootd' || !backup.data) {
    throw new Error('不是有效的 OOTD 備份檔。');
  }
  const images = (backup.images ?? []).map((img) => ({
    id: img.id,
    blob: base64ToBlob(img.base64, img.type),
  }));
  await db.transaction('rw', [db.items, db.outfits, db.profiles, db.listings, db.wearlogs, db.images], async () => {
    await Promise.all([
      db.items.clear(),
      db.outfits.clear(),
      db.profiles.clear(),
      db.listings.clear(),
      db.wearlogs.clear(),
      db.images.clear(),
    ]);
    await db.items.bulkAdd(backup.data.items ?? []);
    await db.outfits.bulkAdd(backup.data.outfits ?? []);
    await db.profiles.bulkAdd(backup.data.profiles ?? []);
    await db.listings.bulkAdd(backup.data.listings ?? []);
    await db.wearlogs.bulkAdd(backup.data.wearlogs ?? []);
    await db.images.bulkAdd(images);
  });
  return { items: backup.data.items?.length ?? 0, images: images.length };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(((r.result as string) || '').split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
