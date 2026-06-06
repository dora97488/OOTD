// =============================================================
// 儲存持久化 —— 要求瀏覽器把本機資料標為「持久」，降低 iOS / Safari 在儲存吃緊時
// 清掉 IndexedDB（連帶清掉所有衣物照片）的風險。App 啟動時呼叫一次即可（見 main.tsx）。
//
// ⚠️ 這不是 100% 保證；真正的安全網是個人中心的「匯出 / 匯入」（見 data/backup.ts）。
// =============================================================

/** 嘗試要求持久化儲存。回傳最終是否為持久狀態。 */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** 回報目前用量 / 配額（給「我的」頁顯示儲存狀況用，選用）。 */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota };
  } catch {
    return null;
  }
}
