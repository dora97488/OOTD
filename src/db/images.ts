// 圖片存取工具：入庫前壓縮（最長邊 1080、webp、保留透明），畫面取 objectURL。
import { v4 as uuid } from 'uuid';
import { db } from './db';

const MAX_EDGE = 1080;
const QUALITY = 0.85;

export async function storeImage(blob: Blob): Promise<string> {
  const compressed = await compress(blob);
  const id = uuid();
  await db.images.add({ id, blob: compressed });
  return id;
}

export async function getImageURL(id?: string): Promise<string | undefined> {
  if (!id) return undefined;
  const rec = await db.images.get(id);
  return rec ? URL.createObjectURL(rec.blob) : undefined;
}

export async function getImageBlob(id?: string): Promise<Blob | undefined> {
  if (!id) return undefined;
  const rec = await db.images.get(id);
  return rec?.blob;
}

export async function deleteImage(id?: string): Promise<void> {
  if (id) await db.images.delete(id);
}

async function compress(blob: Blob): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const out = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/webp', QUALITY)
    );
    return out ?? blob;
  } catch {
    return blob; // 壓縮失敗就存原檔
  }
}
