// 穿搭組合資料存取 —— screens 走這層，不要直接呼叫 db.outfits.*。
import { db, type Outfit } from '../db/db';

export function addOutfit(outfit: Outfit): Promise<string> {
  return db.outfits.add(outfit);
}

export function listOutfits(): Promise<Outfit[]> {
  return db.outfits.orderBy('createdAt').reverse().toArray();
}

export function getOutfit(id: string): Promise<Outfit | undefined> {
  return db.outfits.get(id);
}

export function updateOutfit(id: string, patch: Partial<Outfit>): Promise<number> {
  return db.outfits.update(id, patch);
}

export function deleteOutfit(id: string): Promise<void> {
  return db.outfits.delete(id);
}
