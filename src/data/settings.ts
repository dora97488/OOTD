// 簡易設定存取（key-value）—— screens 走這層，不要直接呼叫 db.settings.*。
// 目前用來存「使用者自填的 OpenAI API key」（IndexedDB 持久化，非 localStorage）。
import { db } from '../db/db';

const OPENAI_KEY_ID = 'openaiApiKey';

/** 取得使用者自填的 OpenAI API key（未設定回 undefined）。 */
export async function getOpenAIKeySetting(): Promise<string | undefined> {
  const row = await db.settings.get(OPENAI_KEY_ID);
  return row?.value || undefined;
}

/** 寫入 / 清除使用者自填的 OpenAI API key（空字串＝清除）。 */
export async function setOpenAIKeySetting(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) {
    await db.settings.put({ id: OPENAI_KEY_ID, value: trimmed });
  } else {
    await db.settings.delete(OPENAI_KEY_ID);
  }
}
