// 每日穿搭記錄資料存取 —— screens 走這層，不要直接呼叫 db.wearlogs.*。
// 撐「今天」分頁的記錄 / 月曆 / 月度統計。每日僅一筆（重拍即覆寫同日）。
import { db, type WearLog } from '../db/db';
import { deleteImage } from '../db/images';

/** 取某日（YYYY-MM-DD）的穿搭記錄。 */
export function getWearLogByDate(date: string): Promise<WearLog | undefined> {
  return db.wearlogs.where('date').equals(date).first();
}

/** 某日是否已記錄（給「今天」分頁判斷建議模式 / 完成模式）。 */
export async function hasWearLog(date: string): Promise<boolean> {
  return (await db.wearlogs.where('date').equals(date).count()) > 0;
}

/** 寫入 / 覆寫某日記錄（同日舊記錄會被清掉＝「重拍 / 改今天穿搭」）。回傳 id。 */
export async function saveWearLog(log: WearLog): Promise<string> {
  const sameDay = await db.wearlogs.where('date').equals(log.date).toArray();
  for (const w of sameDay) {
    if (w.id !== log.id) {
      if (w.imageId && w.imageId !== log.imageId) await deleteImage(w.imageId);
      await db.wearlogs.delete(w.id);
    }
  }
  return db.wearlogs.put(log);
}

/** 列出某月份（YYYY-MM）的所有記錄，供月曆 / 月度統計（依日期升冪）。 */
export async function listWearLogsInMonth(yearMonth: string): Promise<WearLog[]> {
  const all = await db.wearlogs.where('date').startsWith(yearMonth).toArray();
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

/** 列出全部記錄（日期新→舊）。 */
export function listWearLogs(): Promise<WearLog[]> {
  return db.wearlogs.orderBy('date').reverse().toArray();
}

/** 刪除一筆記錄，並清掉它的穿搭照 blob。 */
export async function deleteWearLog(id: string): Promise<void> {
  const w = await db.wearlogs.get(id);
  if (w?.imageId) await deleteImage(w.imageId);
  await db.wearlogs.delete(id);
}
