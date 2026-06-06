// =============================================================
// 去背引擎入口 —— provider 工廠 + 向後相容的 facade。
//
// 設計：上層呼叫 removeBackground()（與舊版簽名相同），內部用 getBackgroundRemover()
// 依目前平台挑 provider。純 PWA 一律回 WASM；日後原生 Vision plugin 接好且在原生殼執行時，
// 自動優先用原生去背 —— 呼叫端（AddItem 等）完全不用改。
// =============================================================
import type { BackgroundRemover } from './types';
import { wasmBackgroundRemover } from './wasm';
import { nativeVisionBackgroundRemover } from './nativeVision';

export type { BackgroundRemover } from './types';

// 優先序：原生 Vision（品質最佳）→ WASM（跨平台預設、保底）。
const PROVIDERS: BackgroundRemover[] = [nativeVisionBackgroundRemover, wasmBackgroundRemover];

let cached: BackgroundRemover | undefined;

/** 取得目前環境最適合的去背 provider（結果快取）。 */
export async function getBackgroundRemover(): Promise<BackgroundRemover> {
  if (cached) return cached;
  for (const p of PROVIDERS) {
    if (await p.isAvailable()) {
      cached = p;
      return p;
    }
  }
  cached = wasmBackgroundRemover; // 理論上 WASM 一定可用，保底回它
  return cached;
}

/**
 * 去背 facade（與舊版 engines/bgRemove.ts 簽名相同，向後相容）。
 * @param input 原圖 blob
 * @param onProgress 進度回呼 0~1
 */
export async function removeBackground(
  input: Blob,
  onProgress?: (ratio: number) => void
): Promise<Blob> {
  const provider = await getBackgroundRemover();
  return provider.remove(input, onProgress);
}
