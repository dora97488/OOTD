# OOTD — Outfit Oracle Today

> The Weather Doesn't Bother Me Anyway
> 結合命理（五行 / 農民曆）與天氣的電子衣櫥 PWA。

這是 **Phase 0 基礎建設骨架**：一個能跑、能裝、能離線的純本機 PWA，把全隊共用的東西先做好。各功能負責人在既有插槽上往裡填即可，不必再搭環境。

---

## 快速開始

```bash
npm install
npm run dev      # 本機開發 (http://localhost:5173)
npm run build    # 產出 dist/（已驗證可 build，含 PWA service worker）
npm run preview  # 預覽 build 結果
```

手機測試：`npm run dev -- --host` 後用同網段手機開；或部署後（見下）用 Safari →「加入主畫面」安裝成全螢幕 App。

---

## 已經做好的基礎建設（可直接用）

- **PWA**：`vite-plugin-pwa`（manifest + service worker，可安裝、可離線）。
- **資料層**：`src/db/db.ts`（Dexie/IndexedDB，含所有資料表）、`src/db/images.ts`（圖片壓縮入庫＋取 URL）。**全 App 唯一資料來源，請一律走 `db.*`。**
- **路由 + 守門 + 導覽**：`src/App.tsx`（HashRouter；首次無命盤 → 導 onboarding）、`components/BottomNav.tsx`（四分頁＋中央＋）。
- **共用引擎**（`src/engines/`）：
  - `bgRemove.ts` — WASM 去背（`@imgly`，延遲載入、含進度）。
  - `color.ts` — 從去背圖抽主色（只取非透明像素）。
  - `wuxing.ts` — 顏色→五行、八字喜忌（簡化「補不足」，已驗證 lunar API）。
  - `almanac.ts` — 今日干支 / 宜 / 忌 / 今日五行。
  - `recommend.ts` — CPW、建議轉售、今日宜穿評分（純函式）。
  - `weather.ts` / `igExport.ts` — 介面已定，內為佔位（見下方插槽）。
- **設計 token**：`src/index.css` 的 CSS 變數，含五行色 `--wood/--fire/--earth/--metal/--water`。Tailwind 已對應語意色（`bg-seal`、`text-ink`、`border-line`…）。**請沿用，不要各自硬寫色碼。**

已串成可跑的參考迴圈：**onboarding → 新增衣物（去背+抽色+五行+存檔）→ 衣櫥列表 → 單品詳情**。新增頁 `screens/AddItem.tsx` 是把引擎與資料層串起來的範本，照它的寫法擴充即可。

---

## 功能插槽（誰負責什麼）

每個未完成頁面用 `components/Placeholder.tsx` 標了接手說明。認領後把 owner 填上、內容換掉。

| 區塊 | 檔案 | 狀態 | 接手要點 |
|---|---|---|---|
| 首頁・今日開運穿搭 | `screens/Home.tsx` | 輕量可跑 | 農民曆卡已真資料；細化開運穿搭卡、穿搭詳情 Sheet、七日行事曆(P1) |
| 衣櫥・列表/新增/詳情 | `screens/Closet.tsx`／`AddItem.tsx`／`ItemDetail.tsx` | 可跑（參考實作） | 整身穿搭萃取、編輯欄位、批次匯入 |
| 穿搭組合 | `screens/Outfits.tsx`／`OutfitBuilder.tsx` | 插槽 | 多選單品→命名→存 `db.outfits`；色系相似/跳色 |
| 轉售・幫衣服找主人 | `screens/Resale.tsx` | 畫面 only | 建議清單已真資料；上架/在售存 `db.listings`，市集/聊天/金流為 Phase 2 |
| 個人中心・統計/設定 | `screens/Profile.tsx` | 插槽 | 穿著統計、IG 匯出、匯出/匯入、通知偏好(P1) |
| 天氣引擎 | `engines/weather.ts` | 佔位 | 接中央氣象署(CWA) API（免費 key），海外用 OpenWeather |
| IG 匯出 | `engines/igExport.ts` | 佔位 | canvas 合成 flat-lay → PNG → `navigator.share` |
| 農民曆精修 | `engines/almanac.ts` | 可跑 | 吉時、宜忌簡繁轉換（lunar 回傳為簡體字串） |

各功能負責人多在**自己的 screen 檔**內工作，共用邏輯放 `engines/`，避免互相衝突。新增頁面：在 `App.tsx` 加一條 `<Route>` + `screens/` 放檔。

---

## 技術與注意

- **路由用 HashRouter**：為了在 GitHub Pages / Netlify 等靜態主機免設定也不會 404。
- **部署**：`npm run build` 後把 `dist/` 丟上 GitHub Pages 或 Netlify。`vite.config.ts` 的 `base` 已設 `'./'`（相對路徑，相容子路徑）。
- **去背模型**：`@imgly` 首次去背會下載模型（數十 MB，已做成延遲載入、不進預快取、附進度條、可跳過）。
- **命理免責**：八字喜忌為簡化模型，UI 已標「僅供參考」。要升級成旺衰/喜用神，改 `engines/wuxing.ts` 即可（介面不變）。
- **資料只在本機**：清瀏覽器資料或換機會遺失 → 個人中心要做匯出/匯入當安全網。
- **`@imgly/background-removal` 為 AGPL**：自用沒問題；若日後商業化閉源，需改授權或換可商用模型。

詳細產品規格見另附的《OOTD 開發計劃書 v2》與《OOTD Phase 0 實作規格》。
