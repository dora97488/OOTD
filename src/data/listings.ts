// 轉售草稿資料存取（Phase 0 僅本機）—— screens 走這層，不要直接呼叫 db.listings.*。
import { db, type Listing } from '../db/db';

export function addListing(listing: Listing): Promise<string> {
  return db.listings.add(listing);
}

/** 所有轉售草稿，依建立時間新→舊（createdAt 未建索引，故於記憶體排序）。 */
export async function listListings(): Promise<Listing[]> {
  const all = await db.listings.toArray();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteListing(id: string): Promise<void> {
  return db.listings.delete(id);
}
