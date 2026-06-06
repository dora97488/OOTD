# 首頁（Tab 1｜今天）PRD

> OOTD Phase 0 ・ 負責人：P1 首頁 / 命理引擎
> 對應檔：`src/screens/Home.tsx` + `engines/{wuxing,almanac,recommend,weather}.ts`
> 視覺一律遵循 `docs/design-system.md`（Editorial Vibe：暖紙＋襯線＋terracotta）。
> 命理為簡化模型，凡顯示喜忌處 UI 必須標「僅供參考」。

---

## 1. 目標與範圍

**一句話：** 使用者每天打開 App 的第一個畫面，回答兩個問題——「今天適合穿什麼？」與「我今天穿了什麼？」，並用月曆把每天的實際穿搭串成可回顧的紀錄。

**核心迴圈（首頁負責的段落）：**
看今日天氣＋開運建議 → 生成 3 件建議搭配 →（使用者自行決定穿搭）→ **拍下今天「實際穿的」整身照** → 完成模式看五行解析、輸出 IG → 月曆累積紀錄與月度統計。

**Phase 0 範圍：**
- 純 local-first，資料／圖片走 `src/data/`（IndexedDB），無後端。
- 天氣、IG 輸出引擎目前為佔位（stub），首頁要能在 stub 下正常渲染，待引擎到位即接上。
- 占卜原理「占星」模式可先做皮（切換 UI 在、解析文案可後補）。

**非範圍（本期不做）：**
- 每日推播排程（07:30／21:00）——屬通知後端／Capacitor，歸 Profile 與基礎建設。
- 建議搭配的「直接套用為今日紀錄」——記錄的是實際穿的，不是 gen 的（見 §5.3）。
- 真實天氣 API、真實 IG 合成圖（等 `weather.ts` / `igExport.ts` 實作）。

---

## 2. 前置條件與角色

- **單一使用者**（本人命盤 `Profile` id 固定 `'me'`）。
- 進首頁前已完成 onboarding（有 `Profile`，含 `favorable` / `unfavorable` / `wuxingCount` / `zodiacSign`）。
- 衣櫥可能為空 → 首頁須有空狀態（見 §5.2 / §8）。
- 「今天」以裝置本地日期 `YYYY-MM-DD` 為 key，與 `WearLog.date` 對齊。

---

## 3. 畫面結構總覽

由上而下：

1. **頂列**（Close / Keywords，沿用現有 editorial 風格）
2. **固定區 A — 占卜原理切換**（混合／五行／占星）
3. **固定區 B — 天氣列**（地點・溫度・天氣・降雨・體感）
4. **內容區（雙態，依「今天是否已記錄」切換）**
   - 4a 未記錄＝建議模式
   - 4b 已記錄＝完成模式
5. **月曆區**（月份切換 + 星期列 + 網格 + 月度統計）
6. **日期底部 Sheet**（點月曆某日彈出）

> 現況 `Home.tsx` 已有：editorial 封面、去背拼貼（洗牌→揭曉）、月曆網格與「本月已記錄 N 天」。**尚缺：** 占卜原理切換、天氣列、雙態邏輯（開運卡 / 建議 3 件 / 拍照入口 / 完成模式解析卡 / IG 輸出）、月度統計三欄、日期 Sheet。差距清單見 §10。

---

## 4. 狀態機

```
進首頁
 └─ 讀 hasWearLog(today)
      ├─ false → 建議模式（§5.1 開運卡 + §5.2 生成建議 + §5.3 拍照入口）
      └─ true  → 完成模式（§5.4 拼貼照 + §5.5 五行解析 + §5.6 IG/重拍）
```

- 切換點：`hasWearLog(today)`（`src/data/wearlogs.ts`）。建議用 `useLiveQuery` 讓拍照存檔後即時翻面，不需手動 reload。
- 「重拍／改今天穿搭」= 覆寫同日紀錄（`saveWearLog` 內部已處理同日去重＋舊圖清除），完成→建議的回退由刪除紀錄 `deleteWearLog` 觸發（若提供「刪除今天紀錄」）。

---

## 5. 各區塊詳規

### 5.0 固定區 A — 占卜原理切換
- 三選一分段控制：**混合 / 五行 / 占星**（預設值取自 `Profile`，可在此臨時切換；是否回寫偏好由 Profile 頁負責，首頁僅切當下顯示）。
- 影響範圍：開運卡「占卜理由」文案、完成模式解析卡的解讀角度。
  - **五行**：用 `almanac.luckyWuxing` + `profile.favorable/unfavorable` 出建議。
  - **占星**：用 `profile.zodiacSign`（文案可先做皮）。
  - **混合**：兩者並陳，五行為主、占星為輔。
- 標「僅供參考」。

### 5.1 固定區 B — 天氣列
- 欄位：地點、溫度 `tempC`、天氣 `desc`、降雨 `rainProbPct`、體感 `feelsLikeC`。
- 來源：`getCurrentWeather(lat,lng)`（`engines/weather.ts`，現為 stub 回 `{24,25,20,'晴時多雲'}`）。定位走 `getCoords()`（platform 能力，**勿直接用 `navigator.geolocation`**）。
- 無定位權限 / API 失敗 → 顯示 stub 值或「—」，不可整頁崩。
- 載入中顯示骨架，不阻塞下方內容。

### 5.2 建議模式 — 開運卡
- 內容：**日期**（`almanac.dateLabel` + 農曆 `lunarLabel`）、**今日主題標題**（沿用 `THEMES`，editorial 大標）、**幸運色色票**、**占卜理由**。
- 幸運色：由 `almanac.luckyWuxing` + `profile.favorable` 映射到顏色（透過 `engines/color.ts` / `constants/colors.ts` 的五行↔色錨點），渲染成一排色票（含色名）。
- 五行色字用語意 class `text-wood/fire/earth/metal/water`，禁硬寫 hex。

### 5.2b 建議模式 — 生成今日建議搭配
- CTA「生成今日建議搭配」→ loading（沿用拼貼「洗牌→揭曉」動畫，現有 3 秒 reveal）→ 展開 **3 件建議單品**（去背圖拼貼，可點進單品 Sheet / ItemDetail）。
- 推薦來源：`recommendOutfit(items, lucky, fav, unfav)`（每類最高分各一件）。目前取前 6 件鋪拼貼；**建議模式定調為「3 件」**，依設計稿（外套／上衣／下身或鞋）取代表性 3 件。
- 空衣櫥 → 顯示「衣櫥還是空的」＋「去新增衣物」CTA（現況已有）。
- 重新生成：可重抽（換動畫 key）。建議標示「建議來自你的喜用神＋今日五行，僅供參考」。

### 5.3 建議模式 — 「拍下今天穿搭」入口卡
- 分隔線後一張入口卡：拍照／相簿 → 存整身照為 `WearLog`。
- ⚠️ 記錄的是**使用者實際穿的整身照**，不是上面 gen 的建議。
- 流程：選圖 → 壓縮存圖（`storeImage`，1080px webp）→ 拆解單品（`itemIds` 可先空，之後補標）→ `saveWearLog({date: today, imageId, itemIds, wuxingTone})` → 翻為完成模式。
- 此流程可沿用／取代 `OutfitBuilder`；首頁只需入口與最小存檔，複雜編輯交給既有 builder。

### 5.4 完成模式 — 今日穿搭拼貼照
- 主視覺：今日 `WearLog.imageId` 的**整身照**（依設計稿，左為整身鏡面照）＋ 右側去背單品疊放拼貼（`itemIds` 對應 `Item.imageId`）。
- **「已記錄」標籤**（角標）。
- 可點單品 → ItemDetail / 單品 Sheet（穿著次數、CPW、分析）。
- 若 `itemIds` 為空（尚未拆解）→ 只顯示整身照 + 「補標單品」提示。

### 5.5 完成模式 — 今日五行／占星解析卡
- **五行分布長條圖** + 文字解析。
- 資料：當日穿搭單品的 `wuxing` 統計（或 `WearLog.wuxingTone` 主導五行）疊 `profile.wuxingCount`。
- 文案隨 §5.0 占卜原理切換調整視角；標「僅供參考」。

### 5.6 完成模式 — 輸出 IG / 重拍
- **「輸出今天穿搭到 IG」**：`exportOutfitImage(urls)`（`engines/igExport.ts`，現 stub 回 null）合成 Story 尺寸 PNG → `navigator.share({files})` 或下載。
  - 選項：**是否去背、是否加品牌 logo**（依設計稿）。stub 期間按鈕可在但提示「即將推出」。
- **「重拍／改今天穿搭」**：回 §5.3 流程，覆寫同日紀錄。

### 5.7 月曆區
- **月份切換 header**（‹ 月份 ›，現況已有 `shift`）。
- **星期列**（Mon–Sun，週日紅標，現況已有）。
- **月曆網格**：有記錄日顯示當天穿搭**縮圖**（`WearLog.imageId`）、**今天高亮**（terracotta 內框，現況已有）。
- **月度統計三欄**（現況僅「本月已記錄 N 天」，需擴充）：
  1. 本月穿搭次數 = 當月 `WearLog` 筆數。
  2. 最常穿單品 = 當月各 `WearLog.itemIds` 出現次數 Top1（顯示縮圖＋名稱）。
  3. 本月支出 = 當月新增 `Item.price` 加總（或當月穿著單品的 CPW 視角，二擇一，建議「新增單品支出」較直覺）。
- 資料：`listWearLogsInMonth('YYYY-MM')`（已有）。

### 5.8 日期底部 Sheet
- 點月曆某日 → 由下滑出 Sheet：
  - 該日穿搭**件數**、**單品列**（縮圖橫滑，點→ItemDetail）、**當日五行基調**（`WearLog.wuxingTone` 或單品五行統計）。
  - 若該日無紀錄 → 顯示「這天還沒有紀錄」（若為今天/過去，提供「補記」入口；未來日期則僅顯示）。
- 資料：`getWearLogByDate(date)`。

---

## 6. 資料模型對應（皆走 `src/data/`，勿直接 `db.*`）

| 用途 | 型別 / 欄位 | API |
|---|---|---|
| 今日是否已記錄 | `WearLog` | `hasWearLog(date)` / `getWearLogByDate(date)` |
| 存／覆寫今日穿搭 | `WearLog{date,imageId,itemIds,wuxingTone,note}` | `saveWearLog(log)`（同日自動覆寫＋清舊圖） |
| 月曆 / 月度統計 | `WearLog[]` | `listWearLogsInMonth('YYYY-MM')` |
| 刪除（完成→建議回退） | — | `deleteWearLog(id)` |
| 衣物（建議 / 拼貼 / 統計） | `Item{wuxing,season,price,wearCount,name,imageId}` | `listItems()` |
| 本人命盤（喜忌 / 星座） | `Profile{favorable,unfavorable,wuxingCount,zodiacSign,mode}` | `getProfile()` |
| 圖片存取 | blob | `storeImage(blob)` / `getImageURL(id)`（記得 `revokeObjectURL`） |

> 不需要動 `db.ts` schema（`WearLog` 表 v2 已建、`Item.name`／`洋裝` 為非索引變更）。若需新欄位（如建議搭配快取），先喊基礎建設負責人 `version(3)` 升版。

---

## 7. 引擎依賴對照

| 引擎 | 函式 | 首頁用途 | 狀態 |
|---|---|---|---|
| `engines/almanac.ts` | `getTodayAlmanac()` | 日期、農曆、今日五行、宜忌 | ✅ 可用 |
| `engines/recommend.ts` | `recommendOutfit()` / `scoreItem()` / `cpw()` | 建議 3 件、最常穿、支出 | ✅ 可用 |
| `engines/wuxing.ts` | `colorToWuxing()` / `computeBazi()` | 五行↔色、命盤（唯一來源） | ✅ 可用 |
| `engines/color.ts` + `constants/colors.ts` | 色錨點 | 幸運色色票 | ✅ 可用 |
| `engines/weather.ts` | `getCurrentWeather()` / `getCoords()` | 天氣列 | ⚠️ stub |
| `engines/igExport.ts` | `exportOutfitImage()` | 輸出 IG | ⚠️ stub |

平台能力（定位/通知）一律走 `platform/capabilities.ts`，**勿在 screen 直接碰 `navigator.*`／`Notification`**。

---

## 8. 邊界情境

- **無 Profile**（未 onboarding）：理論上不會到首頁；防呆顯示「先完成個人設定」並導去 onboarding。
- **空衣櫥**：建議模式顯示空狀態 CTA；天氣／月曆／開運卡仍可顯示。
- **無定位／天氣失敗**：天氣列降級顯示，不阻塞。
- **今日已記錄但無 itemIds**：完成模式只顯示整身照＋補標提示。
- **跨日**：App 在前景過午夜，重新讀 `today` 應翻回建議模式（可在 focus/visibilitychange 時重算）。
- **圖片載入**：所有 `getImageURL` 都要在 cleanup `revokeObjectURL`（現況 cutout/cell 已示範）。
- **IG stub**：按鈕保留，點擊提示「即將推出」，不可丟錯。

---

## 9. 與設計稿一致性要點（見頂部參考圖）

- 完成模式 = 左整身鏡面照 + 右去背單品直列疊放（外套→上衣→腰帶→下身→鞋→包→配件）。
- 月曆 FAB（＋）為主要記錄入口（現況已有，導向記錄流程）。
- IG 分享圖含品牌 logo 浮貼（如 MUJI / BREEZE / asics 範例），對應「是否加品牌名稱 logo」選項。

---

## 10. 與現況 `Home.tsx` 的差距（實作待辦）

- [ ] **占卜原理切換**（混合／五行／占星）分段控制 + 影響文案。
- [ ] **天氣列**（接 `getCurrentWeather` + `getCoords`，含降級）。
- [ ] **雙態邏輯**：以 `hasWearLog(today)` 切建議／完成模式（現況只有建議拼貼）。
- [ ] **開運卡**：日期＋主題＋幸運色色票＋占卜理由（現況封面缺幸運色與理由）。
- [ ] **建議搭配定調 3 件**（現取前 6）＋「生成」CTA 顯式化。
- [ ] **拍下今天穿搭入口卡** → 存 `WearLog`（現況 FAB 直接導 `/closet/add`，需改為記錄流程）。
- [ ] **完成模式**：拼貼照＋已記錄標籤、五行解析卡（長條圖）、IG 輸出、重拍。
- [ ] **月度統計三欄**（現只有「已記錄 N 天」）。
- [ ] **日期底部 Sheet**（點某日彈出當日詳情）。

---

## 11. 驗收標準（Phase 0）

1. 無紀錄日打開 → 看到天氣列、開運卡（日期/主題/幸運色/理由）、可生成 3 件建議、可進拍照入口。
2. 拍照存檔後**即時**翻為完成模式（整身照＋已記錄標籤＋五行解析）。
3. 「重拍」覆寫同日紀錄，舊圖被清除（無孤兒 blob）。
4. 月曆正確標今天、有紀錄日顯示縮圖；切月正確；月度統計三欄數字正確。
5. 點月曆某日彈出 Sheet，顯示件數／單品列／五行基調。
6. 占卜原理切換會改變開運卡 / 解析卡的文案視角。
7. 天氣／IG stub 下不崩、有合理降級；所有喜忌處標「僅供參考」。
8. `npm run build` 零型別錯誤；資料全走 `src/data/`，無 `localStorage`、無直接 `db.*` / `navigator.*`。

---

## 12. 後續（Phase 1+，非本期）

- 真實 CWA 天氣、真實 IG 合成圖。
- 建議搭配「一鍵存為當日參考」與穿後回填 `note` → 運勢驗證閉環。
- 每日推播（07:30 開運 / 21:00 記錄提醒）——通知後端 / Capacitor。
- 自動拆解整身照單品（vision）取代手動補標。
