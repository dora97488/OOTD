// Apple Vision 原生去背 provider —— 介面先備好，目前為 stub（純 PWA 不啟用）。
//
// 為什麼還不能用：VNGenerateForegroundInstanceMaskRequest 是 iOS 原生 API，
// 只能從 Swift 呼叫，PWA 的 JavaScript 碰不到。要啟用必須：
//   1. 導入 Capacitor（步驟見 docs/iOS_封裝路徑.md）。
//   2. 寫一個 Capacitor 原生 plugin（Swift），在 iOS 端：
//        - 收 web 傳來的圖片（base64 / 暫存檔路徑）
//        - 用 VNGenerateForegroundInstanceMaskRequest（iOS 17+）算前景遮罩
//        - 套遮罩輸出去背 PNG，回傳給 web
//   3. 在本檔 remove() 內呼叫該 plugin（例：import { Vision } from 'ootd-vision-plugin'），
//      並把下方 PLUGIN_READY 改 true。
// 在那之前 isAvailable() 恆為 false，工廠不會選到它（一律用 WASM）。
import type { BackgroundRemover } from './types';
import { isNativePlatform } from '../../platform/capabilities';

// ← 接好 Capacitor Vision plugin 後改 true 並實作 remove()
const PLUGIN_READY = false;

export const nativeVisionBackgroundRemover: BackgroundRemover = {
  id: 'native-vision',
  async isAvailable() {
    return PLUGIN_READY && isNativePlatform();
  },
  async remove(_input, _onProgress) {
    throw new Error(
      '[bgRemove] 原生 Apple Vision 去背尚未啟用：需先導入 Capacitor 並實作 Vision plugin，' +
        '詳見 docs/iOS_封裝路徑.md。目前請改用 WASM provider。'
    );
  },
};
