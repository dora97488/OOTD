# CLAUDE.md — OOTD 專案規範

> 這是 Claude Code 每次 session 自動讀取的專案記憶。**請嚴格遵守以下慣例**，
> 確保多人各自開發時不互相衝突、風格一致。詳細產品規格見 `docs/`。

## 專案概述
OOTD（Outfit Oracle Today）：結合命理（五行/農民曆）與天氣的電子衣櫥 **PWA**。
目前是 **Phase 0**：純 local-first（資料與圖片存 IndexedDB，**無後端**），WASM 去背。
**核心迴圈：** 算五行喜忌 → 衣物建檔（去背）→ 每天「今天」看開運建議／記錄實際穿搭 → 月曆與統計 → 衣櫥優化／轉售。
**四大分頁：** 今天（首頁）／衣櫥／轉售／我的，外加首次 onboarding。功能細節見下方〈功能規格〉。

## 指令
- `npm run dev` — 本機開發
- `npm run build` — 產線打包（含 PWA service worker）
- `npm run preview` — 預覽 build
- 天氣需 CWA key：`cp .env.local.example .env.local` 後填 `VITE_CWA_API_KEY`（見 `.env.local.example`）。

## 技術架構（分層 —— 三個 swap point）
- React 18 + TypeScript + Vite；Tailwind CSS
- 🎨 **設計系統（Editorial Vibe：暖紙＋襯線＋terracotta）**：token 在 `src/index.css` ＋ `tailwind.config.js`，完整規範見 **`docs/design-system.md`**（W3C token：`docs/design-tokens.json`）
- **HashRouter**（為相容 GitHub Pages 與未來 Capacitor 包裝，**不要改成 BrowserRouter**）
- **資料層 `src/data/`** — 全 App 資料存取入口（包覆 `src/db/` 的 Dexie/IndexedDB）。單一 swap point：日後接後端只改這裡，screens 不動。含 `backup.ts`（匯出/匯入安全網）。
- **平台能力 `src/platform/`** — 定位 / 通知 / 執行環境偵測 / 儲存持久化。未來包 Capacitor 換原生只改這裡。
- **去背 `src/engines/bgRemove/`** — provider 模式：WASM（`@imgly`，現用）＋ 原生 Apple Vision（stub，包 Capacitor 後啟用）。
- 命理：`lunar-javascript`（唯一來源 `engines/wuxing.ts`）
- 圖片：blob 存 IndexedDB，壓縮成 1080px webp（`src/db/images.ts`）
- 📱 之後要把網頁包成 iOS App：見 **`docs/iOS_封裝路徑.md`**

## 開發慣例（務必遵守）
1. **資料一律走 `src/data/` 的 API**（如 `addItem` / `listItems` / `getProfile` / `exportAll`）。**screen 不要直接用 `db.*`**（`db.*` 只在 `data/` 層內部用）；圖片走 `data/` 的 `storeImage / getImageURL`。**禁用 localStorage。**
2. **平台能力一律走 `src/platform/capabilities.ts`**（定位 / 通知 / `isNativePlatform()`）。**不要在 screen 直接用 `navigator.geolocation`、`Notification`、`window.Capacitor`** —— 未來包 Capacitor 才不會散落各處。
3. **去背走 `src/engines/bgRemove` 的 `removeBackground()`**（或 `getBackgroundRemover()`），**不要直接 import `@imgly`**。要加原生去背就新增一個實作 `BackgroundRemover` 的 provider，不改呼叫端。
4. **共用邏輯放 `src/engines/`，功能畫面放 `src/screens/`。** 各人主要改自己負責的 screen 檔。
5. **改共用檔前先喊一聲，由「基礎建設負責人」統一改**：`db/`、`data/`、`platform/`、被多人用的 `engines/`、`index.css` token、`App.tsx` 路由表。新增資料表欄位用 Dexie 升版（`this.version(2).stores({...})`），不要改舊版。
6. **顏色 / 字體用設計 token 與語意 class，不要硬寫 hex / 字型**：背景 `bg-paper`、文字 `text-ink`/`text-muted`/`text-faint`、邊框 `border-line`、主 CTA `bg-terracotta`（舊名 `bg-seal` 仍可用）、五行色 `text-wood/fire/earth/metal/water`、標題用 `font-serif`。完整規範見 **`docs/design-system.md`**。
7. **五行的唯一來源是 `engines/wuxing.ts`**（`colorToWuxing`、`computeBazi`）。命理為簡化模型，凡顯示喜忌處 UI 必須標「僅供參考」。
8. 新增頁面：在 `src/App.tsx` 加一條 `<Route>`，並在 `src/screens/` 放對應檔。
9. **可包裝成 iOS App 的守則**（見 `docs/iOS_封裝路徑.md`）：維持 HashRouter、`vite.config.ts` 的 `base:'./'`、資產走相對路徑。
10. TypeScript strict；共用型別放 `db.ts`。改完跑 `npm run build` 確認零型別錯誤。
11. 不要 commit `node_modules/`、`dist/`。

## 四人分工（認領後把名字填上）
> 各自主要改自己的 screen 檔；跨頁引擎與共用檔依慣例 5 協調。地基（`data/`、`platform/`、`bgRemove/`）已建好。

- **P1 首頁 / 命理引擎**：`screens/Home.tsx` + `engines/{wuxing,almanac,recommend}.ts` 精修 — 負責人：
- **P2 衣櫥**：`screens/{Closet,AddItem,ItemDetail,Outfits,OutfitBuilder}.tsx`（去背 provider 主要消費者）— 負責人：
- **P3 個人中心 / 天氣 / IG**：`screens/Profile.tsx` + `engines/weather.ts`（接 CWA）+ `engines/igExport.ts` — 負責人：
- **P4 轉售 + 基礎建設**：`screens/Resale.tsx` + 兼任**基礎建設負責人**（`data/`、`engines/bgRemove/`、`platform/`、`index.css` token、`App.tsx` 路由表）— 負責人：

每個插槽的待辦寫在該檔的 `// TODO(...)` 與 `components/Placeholder.tsx`。完整對照表見 `README.md`，iOS 封裝見 `docs/iOS_封裝路徑.md`。

## 功能規格（依分頁，v3 線稿）
> 「各分頁要做什麼」的內容規格，搭配上方四人分工的「誰負責哪個檔」。視覺一律照 `docs/design-system.md`。

### Onboarding（僅首次）
- 開場動畫：信封打開、衣服飛出（AI 生成視覺）。
- 輸入個資（生辰…）→ 算五行喜忌 → 進首頁。

### Tab 1｜今天（首頁 `Home`）
- **固定區：** 占卜原理切換（混合／五行／占星）；天氣列（地點／溫度／天氣／降雨／體感）。
- **內容隨「今天是否已記錄穿搭」分兩態：**
  - **未記錄（建議模式）：** 開運卡（日期、今日主題標題、幸運色色票、占卜理由）→「生成今日建議搭配」（loading → 展開 3 件建議單品）；分隔線；「拍下今天穿搭」入口卡。
  - **已記錄（完成模式）：** 今日穿搭拼貼照（去背單品疊放、可點單品）＋「已記錄」標籤；今日五行／占星解析卡（五行分布長條圖＋文字）；「輸出今天穿搭到 IG」；「重拍／改今天穿搭」。
- **月曆區：** 月份切換 header、星期列、月曆網格（有記錄日顯示穿搭縮圖、今天高亮）、月度統計（本月穿著次數／最常穿／本月支出）。點某日 → 底部 Sheet：當日穿搭件數＋單品列＋當日五行基調。
- ⚠️ 記錄的是**使用者實際穿的**（不是 gen 的建議）：存整張全身照，點進去才看拆解單品。IG 輸出可選「是否去背、是否加品牌 logo」。此記錄流程可沿用／取代原 `OutfitBuilder`。

### Tab 2｜衣櫥（`Closet` / `AddItem` / 單品 Sheet）
- 「＋拍照新增衣物」；分類 chips（全部／上衣／下身／外套／**洋裝**／鞋／配件）；搜尋；衣櫥健檢。
- 衣物網格（3 欄，縮圖＋**名稱**＋五行色點）；「幫久未穿的衣服找主人」入口 → 轉售。
- **新增衣物：** 拍照／相簿 → 去背 → 加品牌 → **自動分類**（vision）；另支援電商／衣服連結匯入（先做皮）。
- 點單品 → **底部 Sheet**：大圖、標籤（分類／季節／五行／顏色）、穿著次數、CPW、單品分析。

### Tab 3｜轉售・二手（`Resale`，先做皮）
- 「建議轉售」清單（近 90 天穿著次數＋CPW＋上架入口）。
- 「逛逛別人的衣櫥」市集網格（2 欄：名稱／價格／賣家）；探索含個人化推薦＋「搭配你的五行」適配度。
- 上架、商品詳情、站內聊天為畫面；**交易後台本次不做**。

### Tab 4｜我的（`Profile`）
- 基本資料：頭像、暱稱、出生年／喜用神／星座、五行分布條（圖表＋解釋）。
- 命理資料：生辰／命盤、占卜原理偏好。
- 通知偏好（toggle）：每日開運推播 **07:30**、記得記錄今日穿搭 **21:00**。
- （地基已提供：資料匯出／匯入安全網。）

## 資料模型待補（會動 `db.ts`，由基礎建設負責人 `version(2)` 升版）
- **`Category` 加「洋裝」**（現為 上衣/下身/外套/鞋/配件）→ 同步 `CATEGORIES` 與 AddItem chips。
- **`Item` 加 `name`**（網格與單品 Sheet 顯示；`brand` 已有）。
- **新增 `WearLog`**（日期＋實際穿搭照 imageId＋itemIds＋當日五行基調）撐「今天」的記錄／月曆／月度統計 —— 現無此表。
- **通知偏好**（07:30 / 21:00 開關）：存 `Profile` 新欄位或新表。
- **自動分類 / 電商匯入**：列為目標（自動分類依賴 vision 模型，可先做皮或排後段）。
