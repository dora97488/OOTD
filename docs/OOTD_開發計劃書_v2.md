# OOTD（Outfit Oracle Today）開發計劃書 v2

> **Slogan：** Never stress over what to wear.
> **一句話定義：** 結合命理（五行 / 農民曆）與天氣的「電子衣櫥 + 今日開運穿搭」App。
> 本版依據你們的 IA 與 UI 參考圖重寫，取代第一版。重點：先講清楚架構決策，再把完整功能分階段排序，並標出每項功能「真正需要什麼」。

---

## 0. TL;DR — 三個你交付前必須拍板的決策

1. **去背：** iOS 原生 Vision 去背（`VNGenerateForegroundInstanceMaskRequest`，iOS 17+）品質最好，但**只有原生 App 叫得到,PWA 用 JavaScript 碰不到**。PWA 路線只能用瀏覽器內 WASM 模型（`@imgly/background-removal` 或 Transformers.js + RMBG-1.4）——免費、離線、隱私佳，但首次載入模型較重、舊機較慢。
2. **架構：** 純本機 PWA 適合「個人衣櫥 + 命理穿搭」這顆心臟。但**推播、轉售電商、虛擬試穿**這三項都需要後端/原生，會打破「零後端、不用 Mac」的前提。
3. **建議路徑：** 先用 **local-first PWA** 出 Phase 0（核心衣櫥 + 命理 + 穿搭 + 統計 + IG 匯出，Claude Code 可一手做完）；推播與 AI 建議放 Phase 1（需小後端）；**轉售電商獨立成 Phase 2 大工程**；進階占卜與虛擬試穿放 Phase 3。

---

## 1. 產品定位與核心迴圈

**核心迴圈（這條順，產品就成立）：**
輸入生辰算出五行喜忌 → 把衣服拍照建檔（去背 + 抽色 + 對應五行）→ 每天早上看「今日開運穿搭」（農民曆 + 天氣 + 從衣櫥挑出今日最旺搭配）→ 穿、記錄 → 累積穿著統計 → 衣櫥優化 / 建議轉售。

**差異化：** 一般電子衣櫥只做「管理 + 搭配」；OOTD 把**命理開運**與**天氣**疊在搭配建議上，這是賣點，也是所有運勢功能的地基（每件衣服都要有五行屬性）。

---

## 2. 架構決策（最關鍵的一節）

### 2.1 功能 → 技術需求對照表

| 功能 | 純本機 PWA 可做？ | 需要什麼 |
|---|---|---|
| 單品建檔 / 去背（WASM） | ✅ | 瀏覽器內模型 |
| 衣櫥瀏覽 / 篩選 / CPW / 統計 | ✅ | IndexedDB |
| 手動穿搭組合 / IG 匯出 | ✅ | Canvas 合成 |
| 農民曆 / 五行 / 今日宜穿（靜態） | ✅ | 本地計算 + 對照表 |
| 天氣資訊列 | ✅ | 天氣 API + 定位權限 |
| **每日推播** | ⚠️ 部分 | **需後端排程 + Web Push（VAPID）**；iOS 需加入主畫面，且無本機排程通知 |
| AI 穿搭建議 / AI 上架描述 | ⚠️ | LLM API（可用 Claude API） |
| **原生品質去背** | ❌ | **原生 / hybrid（Swift Vision）** |
| **轉售電商（市集/聊天/金流/物流）** | ❌ | **正式後端 + 帳號 + 金流 + 物流 + 信任安全** |
| **人物模擬 / 虛擬試穿** | ❌ | **託管 ML 模型 / API（pose + 服裝變形）** |

### 2.2 兩條路線

- **路線 A：local-first PWA（建議先走）**
  優點：Claude Code 可整包做完、不用 Mac、零成本、可離線、照片不外洩。免費部署到 GitHub Pages / Netlify，iPhone Safari「加入主畫面」即可。
  缺點：去背用 WASM（品質可，速度略慢）；推播弱（需小後端 + 加主畫面）；不能上 App Store。

- **路線 B：hybrid（Capacitor 或 Expo / React Native）**
  優點：可用 Apple Vision 原生去背、可靠推播、可上 App Store；多數程式碼仍是同一套 web。
  缺點：需 Mac + Xcode、Apple 開發者帳號（年費約 US$99）、App Store 審核。

> **轉售電商不論走 A 或 B 都需要正式後端**（建議 Supabase 或 Firebase + 金流如 TapPay / Line Pay / 綠界 + 物流串接），且涉及台灣二手交易與金流法遵，務必獨立成 Phase 2，不要併進第一版。

---

## 3. 技術選型

**Phase 0（PWA 核心）**

| 層面 | 選擇 | 說明 |
|---|---|---|
| 框架 | React 18 + TypeScript + Vite | Claude Code 友善 |
| PWA | `vite-plugin-pwa` | manifest + service worker（離線快取） |
| 路由 | `react-router` | |
| 本機儲存 | IndexedDB（`dexie` + `dexie-react-hooks`） | 存單品/穿搭/命盤資料與**圖片 blob**。⚠️ 不用 localStorage |
| 去背 | `@imgly/background-removal`（瀏覽器 WASM；備援 Transformers.js + RMBG-1.4） | 免費、離線、隱私佳；顯示載入進度、可跳過 |
| 抽色 | Canvas 像素取樣 或 `node-vibrant`（browser build） | 抽主色 → 命名色 → 五行 |
| 農民曆/八字 | `lunar-javascript`（或 `lunar-typescript`） | 國曆→干支、節氣、八字、宜忌、吉時。⚠️ API 以官方文件為準 |
| 天氣 | 中央氣象署（CWA）開放資料 API（台灣最準）＋ OpenWeather（備援/海外） | 需定位權限 |
| 樣式 | Tailwind CSS | |

**Phase 1 起加入**
- 後端：Supabase（Postgres + Auth + Edge Functions + 排程）或 Firebase。
- 推播：Web Push（VAPID 金鑰），Edge Function 排程每日清晨運算 + 推送。
- LLM：Claude API（AI 穿搭建議、AI 上架描述、塔羅/星盤文案）。

---

## 4. 資訊架構（IA）

照你們的圖，分四大區 + onboarding + 跨頁引擎。階段標記：`P0`＝第一版必上，`P1/P2/P3`＝後續階段，`Sheet`＝底部覆蓋層。

### Onboarding（僅首次）
`① 生辰輸入 → ② 五行屬性揭曉 → ③ 上傳第一件衣物 → ④ 推播授權`
- 權限漸進索取（不要一次全要）：定位（天氣）、生辰（命理）、通知（推播）。

### A. 首頁 — 今日開運穿搭
- 今日農民曆卡：宜 / 忌 / 干支 / 吉時 `P0`
- 天氣資訊列：溫度 / 降雨 / 體感 `P0`
- 開運穿搭卡：從衣櫥挑出今日最旺搭配 `P0`
- 穿搭詳情 Sheet：單品清單 / 五行解析 `Sheet`
- 七日穿搭行事曆：預先規劃每天搭配 `P1`

### B. 衣櫥 — 衣物管理
- 衣物列表：篩選 / 搜尋 / 分類 `P0`
- 新增衣物：拍照 → 去背 → 標籤（單品照、整身穿搭萃取）`P0`
- 單品詳情 / 編輯：穿著次數 / cost-per-wear `P0`
- 穿搭組合創建：手動搭配（色系相似/跳色）/ 儲存（記錄適合天氣、五行）`P0`
- 人物模擬（把自己 P 上去）`P3`
- AI 穿搭建議：依場合/天氣自動配對 `P1`

### C. 轉售電商 — 幫衣服找下個主人
- 建議轉售清單：90 天未穿 / CPW 低 `P0`（清單本身可本機算）
- 上架表單：定價 / AI 描述 / 拍照 `P2`（送出到市集需後端）
- 我的在售商品：狀態追蹤 / 下架 `P2`
- 買家訊息：站內聊天室 `P2`
- 買家瀏覽市集：探索他人上架 `P2`

### D. 個人中心 — 設定 / 統計
- 命理資料：生辰 / 五行屬性 `P0`
- 穿著統計：每月報告 / 趨勢 / Colors by Category / Closet Distribution `P0`
- 通知偏好：推播時間 / 開關 `P1`
- 社群分享設定 / IG 樣板輸出（重要）`P0`（匯出可本機，分享連結需後端）

### 跨頁引擎
- 五行農民曆引擎：干支 / 宜忌 / 吉時 / 幸運色對照 / 生辰喜忌
- 占卜擴充：星盤 / 塔羅 `P3`
- 天氣引擎：CWA / OpenWeather
- 去背 / 分類引擎
- 推播排程引擎 `P1`
- 二手電商後台 `P2`

---

## 5. 資料模型

```ts
type WuXing = '木' | '火' | '土' | '金' | '水';
type Category = '上衣' | '下身' | '外套' | '鞋' | '配件';
type Season = '春' | '夏' | '秋' | '冬' | '四季';

interface Item {
  id: string;
  imageBlobId: string;        // 去背後圖片（IndexedDB）
  originalBlobId?: string;
  category: Category;
  mainColorHex: string;       // 自動抽取主色
  colorName: string;
  wuxing: WuXing;             // 由顏色對應
  season: Season;
  material?: string;          // 手動（自動辨識不可靠）
  brand?: string;
  price?: number;             // CPW 用
  tags: string[];
  wearCount: number;          // 預設 0
  lastWornAt?: number;        // 「90 天未穿」用
  createdAt: number;
}

interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  coverColorWuxing?: WuXing;  // 主導五行（配對命盤喜用）
  suitableSeason?: Season;
  suitableWeather?: string;   // 適合天氣條件
  scheduledDate?: string;     // 行事曆排程用 YYYY-MM-DD
  tripId?: string;            // 旅遊行程歸屬（穿搭日曆）
  createdAt: number;
}

interface Profile {
  id: string;                 // 通常單筆 'me'
  mode: 'bazi' | 'astro';
  birthDate: string;          // YYYY-MM-DD
  birthHour?: number;         // 0-23（八字需時辰）
  dayMasterWuxing?: WuXing;
  wuxingCount?: Record<WuXing, number>;
  favorable: WuXing[];        // 喜用（建議多穿色）
  unfavorable: WuXing[];      // 忌（少穿）
  zodiacSign?: string;
}

interface Trip {              // 穿搭日曆 / 旅遊（如「東京旅遊」）
  id: string;
  name: string;
  destination?: string;
  startDate: string;
  endDate: string;
}

// Listing（轉售）— Phase 2，需後端
interface Listing {
  id: string;
  itemId: string;
  price: number;
  description?: string;       // AI 生成
  status: 'draft' | 'active' | 'sold' | 'delisted';
  createdAt: number;
}
```

---

## 6. 功能模組詳規

### 6.1 單品建檔（命脈）
拍照 / 選相簿 → 去背（WASM，含進度條、**可跳過保留原圖**）→ 抽主色 → 對應五行 → 快速填類別/季節/材質/品牌/價格 → 存檔。
- 兩種來源：單品照、整身穿搭照（萃取單品）。
- ⚠️ 類別/材質自動辨識需訓練過的視覺模型，**P0 不做自動分類**，用大按鈕快速點選；自動辨識列 P3（可接視覺 API / 端上模型）。

### 6.2 顏色 → 五行對照（做成可調設定檔）
| 五行 | 色系 |
|---|---|
| 木 | 綠、青、翠綠、墨綠 |
| 火 | 紅、橙、紫、粉紅 |
| 土 | 黃、棕、咖啡、米色、大地色 |
| 金 | 白、金、銀、灰、米白 |
| 水 | 黑、藍、藏青、深藍 |
作法：抽到的 hex → 量化成最近命名色 → 查表得五行。對照表抽成常數檔便於微調（紫歸火或水各流派不同）。

### 6.3 衣櫥瀏覽與穿搭組合
- 網格牆（去背圖在淺底很好看）；篩選：類別 / 五行 / 顏色 / 季節 / 標籤；搜尋。
- 穿搭：挑多件 → 命名 → 標主導五行 / 適合天氣 → 儲存。色系輔助：相似色、跳色建議。

### 6.4 今日開運穿搭（首頁）
組合三個引擎輸出：
1. 農民曆卡（今日干支 / 宜忌 / 吉時 / 今日幸運色）。
2. 天氣列（依定位取今日溫度/降雨/體感）。
3. 開運穿搭卡：以 `Profile.favorable` ∩ 今日幸運色為目標色，過濾衣櫥中主導五行落在喜用、且 `suitableSeason/Weather` 符合今日天氣的單品/穿搭，排序推薦。點開 → 穿搭詳情 Sheet（單品清單 + 五行解析）。

### 6.5 穿著統計（個人中心）
- 每件衣服 `wearCount`、CPW＝`price / wearCount`。
- 報表：本月穿著次數、最常穿、總支出、Colors by Category、Closet Distribution（上衣/下身/鞋比例是否均衡）。
- 「建議轉售清單」：`lastWornAt` > 90 天未穿 或 CPW 過高 → 進清單（此清單 P0 可本機算）。

### 6.6 IG 匯出（重要）
- 把一套穿搭的去背單品在樣板畫布上合成 flat-lay / 拼貼（可帶今日運勢、幸運色卡、天氣），輸出 Story 尺寸 PNG。
- 全程 Canvas 本機完成，P0 可做。分享「連結」(他人可看) 需後端，列 P2。

### 6.7 轉售電商（Phase 2，獨立大工程）
- 需後端：帳號 / 商品資料庫 / 市集瀏覽 / 站內聊天 / 金流 / 物流 / 評價與檢舉。
- 上架表單可用 Claude API 生成商品描述。
- ⚠️ 涉及台灣 C2C 二手交易、金流特許與消費者保護，建議先做法遵評估與小範圍試營運，不要與 P0 綁定。

---

## 7. 核心引擎詳規

### 7.1 五行農民曆引擎
- 用 `lunar-javascript`：國曆日期/時辰 → 八字四柱、節氣、每日干支、宜忌、吉時。
- **個人喜忌（P0 用簡化模型，UI 須標示「簡化命理、僅供參考」）：**
  1. 八字四柱 8 字各對應五行 → 統計分布。
  2. 日主＝日干五行。
  3. 簡化喜忌：分布中**最少/缺**的元素＝`favorable`，**最旺**＝`unfavorable`（「補不足」法）。
  4. 真正喜用神需日主旺衰分析（月令權重），複雜度高、列為後續優化；演算法封裝成獨立模組便於升級。
- **今日幸運色：** 今日干支五行 + 個人喜用 → 推薦色系（對應 6.2 反查顏色）。
- **流日（P1）：** 用當日干支動態調整每日建議。

### 7.2 占卜擴充（Phase 3）
- **星盤：** 需天文曆（`astronomia` 或 swisseph 的 WASM 版）算太陽/月亮/上升 → 星座 → 西方四元素。⚠️ 西方四元素 ≠ 中式五行，若要與衣櫥五行體系混用須定義轉換規則，否則兩套並行。
- **塔羅：** 牌庫資料 + 抽牌 + 牌義；解讀文案可用 Claude API 生成。實作最輕。
- ⚠️ 關於「東西方大數據」：市面上沒有可直接串接的「占卜大數據」。個人化來自「使用者命盤 + 規則對照表 + 選配 LLM 生成文案」即可，建議產品文案上**不要過度宣稱「大數據」**，以免名實不符。

### 7.3 天氣引擎
- 台灣優先用中央氣象署（CWA）開放資料 API（在地預報最準）；OpenWeather 作為備援與海外。
- 需定位權限；無定位時讓使用者手動選城市。

### 7.4 去背 / 分類引擎
- PWA：`@imgly/background-removal`（WASM）；備援 Transformers.js + RMBG-1.4。首次載模型大，需進度提示 + 可跳過。
- 若改 hybrid：可改用 Apple Vision `VNGenerateForegroundInstanceMaskRequest`（iOS 17+，需實機），品質與速度更佳。
- 圖片入庫前壓縮（最長邊 ~1080px、轉 webp）以省 iOS 儲存配額。

### 7.5 推播排程引擎（Phase 1）
- iOS PWA 推播：需加入主畫面 + 使用者授權；**iOS 無本機排程通知**，故每日「今日開運穿搭」「轉售提醒」皆由後端排程（Edge Function + VAPID）在伺服器端算好後推送。
- 通知偏好頁控制推播時間與開關。

---

## 8. 開發階段

**Phase 0 — 純 PWA 核心（先出貨、可自己用，Claude Code 一手包）**
Onboarding（生辰→五行→第一件衣物）、單品建檔（WASM 去背+抽色+五行）、衣櫥瀏覽/篩選/CPW/穿著次數、手動穿搭組合、今日開運穿搭（農民曆+天氣+靜態推薦）、命理資料頁、穿著統計、IG 匯出。
> 完成標準：能把整櫃衣服拍進去不嫌煩，每天早上打開會想看「今日開運穿搭」。先驗證這個。

**Phase 1 — 加後端的個人化**
小後端（Supabase）+ 每日推播、七日穿搭行事曆、AI 穿搭建議（Claude API）、AI 上架描述、流日運勢。

**Phase 2 — 轉售電商（獨立大工程）**
帳號、商品上架、市集瀏覽、站內聊天、金流、物流、評價/檢舉、二手交易法遵。

**Phase 3 — 進階占卜與虛擬試穿**
星盤、塔羅擴充；人物模擬（虛擬試穿，需 ML 模型/API，可能需原生）；自動單品辨識。

---

## 9. 風險與待確認

- ⚠️ **去背路線：** 要原生品質去背就得走 hybrid（需 Mac + Apple 帳號 + 審核）；維持 PWA 則接受 WASM 去背的速度取捨。**這是要先拍板的分岔。**
- ⚠️ **推播必有後端：** iOS PWA 無本機排程通知，每日開運推播一定要伺服器排程；「純零後端」只能撐到 Phase 0。
- ⚠️ **轉售電商是第二個產品：** 後端 + 金流 + 物流 + 法遵，務必獨立評估，勿綁進第一版。
- ⚠️ **虛擬試穿難度高：** ML 重活，建議延後並以 API 驗證可行性後再投入。
- ⚠️ **命理準確度：** P0 用簡化喜忌，UI 須標示「僅供參考」，引擎模組化以利日後升級。
- ⚠️ **iOS 儲存上限：** 照片多易觸頂，存檔壓縮 + 提供匯出/匯入安全網（建議 P0/P1 就做）。
- ⚠️ **隱私：** 生辰與照片屬敏感資料，P0 全本機;一旦進 Phase 2 有帳號,需明確隱私政策與資料最小化。
