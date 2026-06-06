# iOS 封裝路徑 —— 從 PWA 到 App Store

> 本檔說明 OOTD「之後要把網頁包成 iOS App」的地基設計、可包裝守則，以及真正動手時的步驟。
> **現況：純 PWA（Phase 0）。Capacitor 尚未導入，但程式碼已保持隨時可包裝。**

---

## 1. 為什麼選 Capacitor（而非 React Native / Expo）

我們已有一整套 React + Vite 的 web App。Capacitor 的作法是「把現有 web build 用 WKWebView 包成原生 App」，**幾乎不用改 web 程式碼**，又能：
- 上 App Store / TestFlight
- 叫得到原生能力：相機、推播、檔案、**Apple Vision 原生去背**
- web / PWA 與 iOS App 共用同一份程式碼

React Native / Expo 需要重寫 UI 層，成本高、且丟掉現有 scaffold，故不採用。

---

## 2. 地基設計：三個 swap point

為了讓「之後包 Capacitor」是小工程而非大改寫，所有與平台 / 儲存相關的東西都收斂到三個介面層。**功能負責人請只透過這三層，不要在 screen 裡直接碰底層。**

| swap point | 位置 | 現在（PWA） | 包 Capacitor 後 |
|---|---|---|---|
| **資料** | `src/data/` | 包覆本機 Dexie/IndexedDB | 可換 / 疊加後端（Supabase）或原生 SQLite，screens 不動 |
| **平台能力** | `src/platform/capabilities.ts` | 瀏覽器 API（定位 / 通知 / 執行環境偵測） | 換 Capacitor plugin（Geolocation / Push / App） |
| **去背** | `src/engines/bgRemove/` | `@imgly` WASM provider | `isNativePlatform()` 為真時自動切原生 Vision provider |

`isNativePlatform()`（`platform/capabilities.ts`）目前恆回 `false`；導入 Capacitor 後，`window.Capacitor` 會存在，實機自動回 `true`，上述切換**全自動**。

---

## 3. 可包裝守則（所有人都要遵守）

違反這些會讓之後包 Capacitor 變痛苦，請當成硬規則：

1. **路由維持 `HashRouter`**（`src/App.tsx`）。Capacitor 從 `capacitor://localhost` 載入，hash 路由最穩，**不要改成 BrowserRouter**。
2. **`vite.config.ts` 的 `base` 維持 `'./'`**（相對路徑）。
3. **資產一律相對路徑**，不要寫死 `https://你的網域/...` 或絕對 `/path`。
4. **平台能力一律走 `platform/`**：不要在 screen 直接用 `navigator.geolocation`、`Notification`、`window.Capacitor` 等。
5. **資料一律走 `data/`**：不要在 screen 直接 `db.*`。
6. **圖片走 `data/` 的 `storeImage / getImageURL`**，已壓縮成 1080px webp（顧及 iOS 儲存配額）。

---

## 4. 真正要包的時候：操作步驟（估約半天）

> 前置：macOS + Xcode + CocoaPods。實機測試 / 上架另需 Apple Developer 帳號（年費約 US$99）。

```bash
# 1. 安裝 Capacitor
npm i @capacitor/core
npm i -D @capacitor/cli
npx cap init "OOTD" "com.yourorg.ootd" --web-dir=dist

# 2. 加 iOS 平台
npm i @capacitor/ios
npx cap add ios

# 3. 每次改完 web：build → 同步進原生專案
npm run build
npx cap copy ios      # 只同步 web 資產
# 或 npx cap sync ios  # 連同 plugin 一起同步

# 4. 開 Xcode 跑模擬器 / 實機
npx cap open ios
```

`capacitor.config.ts` 注意：`webDir: 'dist'`、`server.androidScheme`/`iosScheme` 用預設即可（搭配 HashRouter）。

---

## 5. 啟用原生 Apple Vision 去背（Phase 3）

去背介面已備好（`src/engines/bgRemove/nativeVision.ts` 是 stub）。要讓 iOS 用上原生品質去背：

1. 完成第 4 節，導入 Capacitor + iOS 平台。
2. 寫一個 Capacitor 原生 plugin（Swift）：
   - 收 web 傳來的圖片（base64 / 暫存檔路徑）。
   - 用 `VNGenerateForegroundInstanceMaskRequest`（iOS 17+）算前景遮罩、輸出去背 PNG。
   - 回傳給 web。
3. 在 `nativeVision.ts`：`import` 你的 plugin、實作 `remove()`、把 `PLUGIN_READY` 改成 `true`。
4. 完成後，`getBackgroundRemover()` 會在 iOS 實機自動優先用原生 Vision，**`AddItem` 等呼叫端完全不用改**。

在那之前，純 PWA 與 Capacitor WebView 都用 `@imgly` WASM provider，功能正常。

> ⚠️ `@imgly/background-removal` 為 **AGPL**：自用沒問題；若日後商業化、閉源發行，需改其商業授權或換可商用模型。改用原生 Vision 後，iOS 路徑就沒有這個授權顧慮。

---

## 6. 推播（Phase 1）

iOS PWA **無法本機排程通知**，每日「今日開運穿搭」推播必須由後端排程（Edge Function + Web Push / APNs）在伺服器端算好後推送。導入 Capacitor 後改用 `@capacitor/push-notifications`（APNs）。權限請求已封裝在 `platform/capabilities.ts` 的 `requestNotificationPermission()`。

---

## 7. 對照階段路線

- **現在（Phase 0）**：純 PWA，守住上述守則即可。
- **Phase 1**：接後端（換 `data/` 實作）、推播（換 `platform/` 實作）。
- **Phase 3**：導入 Capacitor、啟用原生 Vision 去背、虛擬試穿。
