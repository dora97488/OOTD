// WASM 去背 provider —— @imgly/background-removal，純瀏覽器、不上傳、離線可用。
// 動態 import，避免把大型 WASM 打進首屏；首次呼叫才載入模型（數十 MB）。
// 純 PWA 與未來的 Capacitor WebView 皆可跑，是目前的預設 provider。
import type { BackgroundRemover } from './types';

// 模型權重（數十 MB）只在首次 remove / preload 時下載。用這個 promise 去重：
// 多次 warmUp 或 warmUp 與 remove 並發時，都共用同一次預載，不重複抓。
let warmPromise: Promise<void> | undefined;

export const wasmBackgroundRemover: BackgroundRemover = {
  id: 'wasm',
  async isAvailable() {
    // 瀏覽器環境只要能動態載入模組即視為可用；實際模型在首次 remove 時才下載。
    return typeof window !== 'undefined';
  },
  async remove(input, onProgress) {
    const mod = await import('@imgly/background-removal');
    return mod.removeBackground(input, {
      // 進度 0~1，給 UI 顯示載入 / 處理百分比
      progress: (_key: string, current: number, total: number) =>
        onProgress?.(total ? current / total : 0),
    } as any); // 設定型別在不同版本略有差異，故放寬
  },
  async warmUp() {
    if (typeof window === 'undefined') return;
    // 已預載 / 預載中 → 沿用同一個 promise，避免重複下載模型。
    warmPromise ??= import('@imgly/background-removal')
      .then((mod) => mod.preload())
      .catch((err) => {
        // 預載只是優化，失敗不該影響 App；清掉 promise 讓下次（或真正 remove 時）再試。
        warmPromise = undefined;
        console.warn('[bgRemove] WASM 模型預載失敗（首次去背時會自動重試）:', err);
      });
    return warmPromise;
  },
};
