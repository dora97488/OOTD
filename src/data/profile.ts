// 命盤 Profile 資料存取（固定單筆 'me'）—— screens 走這層，不要直接呼叫 db.profiles.*。
import { db, PROFILE_ID, type Profile } from '../db/db';

/** 取得本人命盤（未建檔回 undefined）。 */
export function getProfile(): Promise<Profile | undefined> {
  return db.profiles.get(PROFILE_ID);
}

/** 寫入 / 覆寫本人命盤（自動帶入固定 id）。回傳 id。 */
export function saveProfile(profile: Omit<Profile, 'id'>): Promise<string> {
  return db.profiles.put({ ...profile, id: PROFILE_ID });
}
