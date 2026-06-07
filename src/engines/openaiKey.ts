// 執行期 OpenAI API key 管理 ——
// 讓使用者在 App 內填入自己的 key（存 IndexedDB，見 data/settings），
// 沒填則回退 build-time 的 VITE_OPENAI_API_KEY（本機 .env，僅 demo 用）。
//
// 圖像 / 視覺引擎（itemPhoto / outfitDetect）一律透過這裡取 key，
// 不要各自讀 import.meta.env —— 維持單一收斂點。
import { getOpenAIKeySetting, setOpenAIKeySetting } from '../data';

const ENV_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim() || '';

// null = 尚未從 DB 載入；'' = 載入過但使用者沒設定。
let runtimeKey: string | null = null;

/** App 啟動時呼叫一次，把 DB 內使用者填的 key 載進記憶體快取（讓同步取值可用）。 */
export async function loadOpenAIKey(): Promise<void> {
  try {
    runtimeKey = (await getOpenAIKeySetting()) ?? '';
  } catch {
    runtimeKey = '';
  }
}

/** 同步取得目前可用的 key：使用者自填優先，否則回退 env。 */
export function getOpenAIKey(): string {
  return (runtimeKey ?? '') || ENV_KEY;
}

/** 取得「使用者自填」的 key（不含 env 回退），供彈窗預填用。 */
export function getUserOpenAIKey(): string {
  return runtimeKey ?? '';
}

/** 目前是否有可用的 key（自填或 env）。 */
export function hasOpenAIKey(): boolean {
  return !!getOpenAIKey();
}

/** 使用者在彈窗填入後呼叫：持久化並更新快取（空字串＝清除，改回退 env）。 */
export async function saveOpenAIKey(key: string): Promise<void> {
  const trimmed = key.trim();
  runtimeKey = trimmed;
  await setOpenAIKeySetting(trimmed);
}
