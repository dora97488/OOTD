// 單品資料存取 —— screens 一律走這層，不要直接呼叫 db.items.*。
// 目前實作為本機 Dexie；日後接後端（Supabase）時只換這裡的實作，screens 不用改。
import { db, type Item } from '../db/db';
import { deleteImage } from '../db/images';

/** 新增單品（呼叫端自備 id，與現有寫法一致）。回傳 id。 */
export function addItem(item: Item): Promise<string> {
  return db.items.add(item);
}

/** 所有單品，依建立時間新→舊。供 useLiveQuery 包裹使用。 */
export function listItems(): Promise<Item[]> {
  return db.items.orderBy('createdAt').reverse().toArray();
}

/** 取單一單品。 */
export function getItem(id: string): Promise<Item | undefined> {
  return db.items.get(id);
}

/** 單品總數。 */
export function countItems(): Promise<number> {
  return db.items.count();
}

/** 局部更新單品欄位。回傳更新筆數。 */
export function updateItem(id: string, patch: Partial<Item>): Promise<number> {
  return db.items.update(id, patch);
}

/** 記錄「今天穿了一次」：穿著次數 +1、更新最後穿著時間。 */
export function recordWear(item: Item): Promise<number> {
  return db.items.update(item.id, {
    wearCount: item.wearCount + 1,
    lastWornAt: Date.now(),
  });
}

/** 刪除單品，並一併清掉它的去背圖與原圖 blob（避免孤兒圖片占用配額）。 */
export async function deleteItem(id: string): Promise<void> {
  const item = await db.items.get(id);
  if (item) {
    await deleteImage(item.imageId);
    await deleteImage(item.originalId);
  }
  await db.items.delete(id);
}
