// 去背 provider 契約 —— 上層（AddItem 等）只依賴這個介面，不依賴特定實作。
// 之後要換成 Apple Vision 原生去背，只要新增一個實作此介面的 provider，
// 在 index.ts 的工廠裡按平台挑選即可，呼叫端完全不用改。
export interface BackgroundRemover {
  /** provider 識別字，方便除錯 / 顯示目前用哪個引擎。 */
  readonly id: 'wasm' | 'native-vision' | (string & {});
  /** 此 provider 在目前環境是否可用。 */
  isAvailable(): Promise<boolean>;
  /** 去背：輸入原圖 blob，回傳去背後 blob（保留透明）。onProgress 回報 0~1。 */
  remove(input: Blob, onProgress?: (ratio: number) => void): Promise<Blob>;
  /**
   * 選用：預先下載 / 初始化模型資源（不實際去背）。在 App 閒置時呼叫，
   * 讓使用者首次拍照時模型已就緒，避免「去背中…」久候。可重複呼叫（內部需自行去重）。
   */
  warmUp?(): Promise<void>;
}
