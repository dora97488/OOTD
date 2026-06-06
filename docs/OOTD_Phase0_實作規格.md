# OOTD Phase 0 — 實作規格（給 Claude Code 開工用）

> **範圍：** 純 local-first PWA、WASM 去背、**無後端**。本檔自足，照做即可。完整路線圖見《OOTD 開發計劃書 v2》。
> **決策定案：** ① 維持 PWA（免 Mac、零成本）② 轉售電商**先做畫面**（本機草稿，不接市集/買家/金流）。
> **Slogan：** The Weather Doesn't Bother Me Anyway

---

## 0. 貼這段給 Claude Code 開工

```
請建立一個名為 OOTD 的 PWA，技術用 React 18 + TypeScript + Vite，行動優先（手機直式，約 390px），全程 local-first（資料與圖片存 IndexedDB，無後端）。請嚴格依附件《OOTD Phase 0 實作規格》逐步實作：先 scaffold 專案與 PWA 設定，建立 Dexie 資料層，再依「§8 建議建置順序」一項一項做，先把「新增衣物（拍照→WASM去背→抽色→對應五行→存檔）」這條命脈跑通。每完成一個模組先讓我在手機 Safari 測試再進下一個。涉及 lunar-javascript 的 API 名稱，請先查官方文件確認，不要憑記憶寫。去背用 @imgly/background-removal。
```

---

## 1. 技術堆疊（已釘版）

| 用途 | 套件 |
|---|---|
| 框架 / 打包 | `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react` |
| PWA | `vite-plugin-pwa`（manifest + service worker，離線快取） |
| 路由 | `react-router-dom` |
| 本機儲存 | `dexie`, `dexie-react-hooks`（IndexedDB，含圖片 blob） |
| 去背 | `@imgly/background-removal`（瀏覽器 WASM） |
| 農民曆 / 八字 | `lunar-javascript`（TS 型別可用 `lunar-typescript`） |
| 樣式 | `tailwindcss`, `postcss`, `autoprefixer` |
| 小工具 | `uuid`（id 生成） |

安裝：
```bash
npm create vite@latest ootd -- --template react-ts
cd ootd
npm i react-router-dom dexie dexie-react-hooks @imgly/background-removal lunar-javascript uuid
npm i -D vite-plugin-pwa tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 2. 專案結構

```
src/
  main.tsx
  App.tsx                  // 路由 + 底部導覽；首次進入導向 onboarding
  db/
    db.ts                  // Dexie 定義
    images.ts              // 圖片 blob 存取（壓縮 + 取出 objectURL）
  engines/
    wuxing.ts              // 顏色→五行、八字喜忌
    almanac.ts             // 農民曆（干支/宜忌/吉時/今日幸運色）
    weather.ts             // CWA / OpenWeather + 定位
    recommend.ts           // 今日宜穿評分、建議轉售
    bgRemove.ts            // @imgly 去背封裝（含進度、可跳過）
    color.ts               // 抽主色（只取非透明像素）
    igExport.ts            // 穿搭 flat-lay 合成 → PNG
  screens/
    Onboarding.tsx
    Home.tsx               // 今日開運穿搭
    Closet.tsx             // 衣櫥列表
    AddItem.tsx            // 新增衣物
    ItemDetail.tsx
    Outfits.tsx
    OutfitBuilder.tsx
    Resale.tsx             // 轉售（畫面 only）
    Profile.tsx            // 個人中心：命理/統計/設定/匯出入口
  components/
    BottomNav.tsx
    ItemCard.tsx
    OutfitDetailSheet.tsx  // 底部覆蓋層
    CategoryPicker.tsx
    Stat*.tsx
  constants/
    colors.ts              // 顏色錨點與五行對照
```

---

## 3. 資料層（Dexie）

```ts
// db/db.ts
import Dexie, { Table } from 'dexie';

export type WuXing = '木' | '火' | '土' | '金' | '水';
export type Category = '上衣' | '下身' | '外套' | '鞋' | '配件';
export type Season = '春' | '夏' | '秋' | '冬' | '四季';

export interface Item {
  id: string; imageId: string; originalId?: string;
  category: Category; mainColorHex: string; colorName: string; wuxing: WuXing;
  season: Season; material?: string; brand?: string; price?: number;
  tags: string[]; wearCount: number; lastWornAt?: number; createdAt: number;
}
export interface Outfit {
  id: string; name: string; itemIds: string[];
  coverWuxing?: WuXing; suitableSeason?: Season; suitableWeather?: string;
  scheduledDate?: string; tripId?: string; createdAt: number;
}
export interface Profile {
  id: string; mode: 'bazi' | 'astro'; birthDate: string; birthHour?: number;
  dayMasterWuxing?: WuXing; wuxingCount?: Record<WuXing, number>;
  favorable: WuXing[]; unfavorable: WuXing[]; zodiacSign?: string;
}
export interface ImageBlob { id: string; blob: Blob; }
export interface Listing { // 轉售草稿（Phase 0 僅本機）
  id: string; itemId: string; price: number; description?: string;
  status: 'draft' | 'listed_local'; createdAt: number;
}

export class OOTDDB extends Dexie {
  items!: Table<Item, string>;
  outfits!: Table<Outfit, string>;
  profiles!: Table<Profile, string>;
  images!: Table<ImageBlob, string>;
  listings!: Table<Listing, string>;
  constructor() {
    super('ootd');
    this.version(1).stores({
      items: 'id, category, wuxing, season, lastWornAt, createdAt',
      outfits: 'id, scheduledDate, tripId, createdAt',
      profiles: 'id',
      images: 'id',
      listings: 'id, itemId, status',
    });
  }
}
export const db = new OOTDDB();
```

圖片：`images/` 存壓縮後 Blob；畫面用 `URL.createObjectURL(blob)` 顯示，記得在卸載時 `revokeObjectURL`。

---

## 4. 畫面與路由

底部導覽四分頁 + 中央「＋」新增：

| Tab | 路由 | 畫面 |
|---|---|---|
| 首頁 | `/` | 今日開運穿搭 |
| 衣櫥 | `/closet` | 衣物列表（篩選/搜尋） |
| ＋ | `/closet/add` | 新增衣物 |
| 轉售 | `/resale` | 建議轉售清單 + 上架/在售（畫面） |
| 我的 | `/profile` | 命理資料 / 穿著統計 / 設定 / 匯出 |

其他路由：`/onboarding`（首次）、`/closet/item/:id`、`/outfits`、`/outfits/new`。
App 啟動時若 `profiles` 無資料 → 導向 `/onboarding`。

---

## 5. 關鍵流程與元件

### 5.1 新增衣物（命脈，先做、最該打磨）
1. 來源二選一：**拍照**（`<input type="file" accept="image/*" capture="environment">`）或**從相簿**（同上但去掉 `capture`）。整身穿搭萃取單品列為後續，P0 先做單件。
2. 去背：`bgRemove.ts` 呼叫 `@imgly/background-removal`，顯示載入/處理進度，提供「**跳過去背、保留原圖**」按鈕（去背失敗或不想等時用）。
3. 抽色：`color.ts` 對去背後圖**只取非透明像素**算主色 → `wuxing.ts` 對應命名色與五行。
4. 表單：類別（大按鈕九宮格）、季節（預設四季）、材質/品牌/價格/標籤（選填）。
5. 壓縮入庫：原圖與去背圖各自縮到最長邊 1080px、轉 webp，存入 `images`，建立 `Item`。

### 5.2 今日開運穿搭（首頁）
由三引擎組裝：
- **農民曆卡**：`almanac.ts` 給今日干支 / 宜 / 忌 / 吉時 / 今日幸運色。
- **天氣列**：`weather.ts` 依定位給溫度 / 降雨 / 體感。
- **開運穿搭卡**：`recommend.ts` 用評分挑出今日最旺單品/穿搭（見 §6.3）。點開 → `OutfitDetailSheet`（單品清單 + 五行解析）。

### 5.3 衣櫥 / 穿搭組合
- 衣櫥：去背圖網格牆；篩選（類別/五行/顏色/季節/標籤）+ 搜尋。
- 穿搭：挑多件 → 命名 → 標主導五行/適合天氣 → 存 `Outfit`。色系輔助：相似色 / 跳色提示。

### 5.4 穿著統計（在「我的」內）
- 每件 `wearCount`；CPW = `price / max(wearCount,1)`。
- 報表：本月穿著次數、最常穿、總支出、Colors by Category、Closet Distribution（上衣/下身/鞋比例）。

### 5.5 轉售（畫面 only）
- **建議轉售清單**：本機算（§6.4），會動、是真資料。
- **上架表單**：擬真畫面，送出存成 `Listing`（status `listed_local`），不外送。描述欄留「AI 生成」按鈕位（P1 接 Claude API）。
- **我的在售**：列出本機 `Listing`，可下架（刪除）。
- 「買家訊息 / 市集」放空狀態或「即將推出」佔位。

### 5.6 IG 匯出
`igExport.ts`：把一套穿搭的去背單品在樣板畫布上排成 flat-lay，可疊今日日期 / 宜 / 幸運色 → `canvas.toBlob('image/png')` → 用 `navigator.share({files})`（支援時）或下載連結。

---

## 6. 引擎演算法（具體）

### 6.1 顏色 → 五行（`constants/colors.ts`）
```ts
export const COLOR_ANCHORS = [
  { hex:'#2e7d32', name:'綠',   wuxing:'木' }, { hex:'#00897b', name:'青綠', wuxing:'木' },
  { hex:'#d32f2f', name:'紅',   wuxing:'火' }, { hex:'#f57c00', name:'橙',   wuxing:'火' },
  { hex:'#8e24aa', name:'紫',   wuxing:'火' }, { hex:'#e91e63', name:'粉紅', wuxing:'火' },
  { hex:'#fbc02d', name:'黃',   wuxing:'土' }, { hex:'#6d4c41', name:'咖啡', wuxing:'土' },
  { hex:'#d7ccc8', name:'米色', wuxing:'土' }, { hex:'#ffffff', name:'白',   wuxing:'金' },
  { hex:'#bdbdbd', name:'灰',   wuxing:'金' }, { hex:'#cfd8dc', name:'銀',   wuxing:'金' },
  { hex:'#000000', name:'黑',   wuxing:'水' }, { hex:'#1565c0', name:'藍',   wuxing:'水' },
  { hex:'#0d47a1', name:'藏青', wuxing:'水' },
] as const;
// 主色 hex → 取與各錨點 RGB 距離最近者 → {colorName, wuxing}
// 進階：轉 Lab 用 ΔE 更準（先 RGB 即可）。對照表可被使用者覆寫。
```

### 6.2 八字喜忌（簡化，`engines/wuxing.ts`）
⚠️ 方法名以 `lunar-javascript` 官方文件 / Context7 為準，以下為流程：
1. `Solar.fromYmdHms(...)` → `getLunar()` → `getEightChar()` 取四柱八字。
2. 取八字 8 個字各自五行（用套件提供之五行方法，或自建 干/支→五行 對照），統計 `wuxingCount`。
3. `dayMasterWuxing` = 日干五行。
4. **簡化喜忌（「補不足」法）**：`wuxingCount` 最少/缺者 → `favorable`；最旺者 → `unfavorable`。
5. ⚠️ UI 須標示「**簡化命理模型，僅供參考**」。本函式獨立，便於日後升級為旺衰/喜用神。

### 6.3 今日宜穿評分（`engines/recommend.ts`）
```ts
function scoreItem(item, todayLucky: WuXing, fav: WuXing[], unfav: WuXing[], season): number {
  let s = 0;
  if (item.wuxing === todayLucky) s += 3;
  if (fav.includes(item.wuxing)) s += 2;
  if (item.season === season || item.season === '四季') s += 1;
  if (unfav.includes(item.wuxing)) s -= 2;
  return s;
}
// 由各類別取最高分單品組一套；或對已存 Outfit 取成員分數總和排序，推前 N 名。
```

### 6.4 CPW 與建議轉售（`engines/recommend.ts`）
```ts
const cpw = (i) => (i.price ?? 0) / Math.max(i.wearCount, 1);
const NINETY_DAYS = 90*24*3600*1000;
function suggestResale(items) {
  const now = Date.now();
  return items.filter(i =>
    (i.lastWornAt ? now - i.lastWornAt > NINETY_DAYS : now - i.createdAt > NINETY_DAYS)
    || (i.price && i.wearCount <= 1 && i.price > 0) // 久未攤平
  );
}
```

### 6.5 天氣（`engines/weather.ts`）
- 定位：`navigator.geolocation.getCurrentPosition`，失敗則讓使用者手選城市。
- 台灣優先中央氣象署（CWA）開放資料 API（需免費 API key）；海外/備援用 OpenWeather。回傳今日溫度、降雨機率、體感。

---

## 7. PWA / 權限

- **manifest**（`vite-plugin-pwa`）：`name:"OOTD"`, `short_name:"OOTD"`, `display:"standalone"`, `theme_color`, `background_color`, `start_url:"."`, `orientation:"portrait"`, icons 192/512。
- **service worker**：快取 app shell 與模型資產，離線可開。
- **相機**：用 `<input capture>`（iOS Safari 最穩），勿依賴 getUserMedia。
- **通知**：onboarding 第④步呼叫 `Notification.requestPermission()` 作為流程佔位；⚠️ **P0 不實際發送推播**（iOS 無本機排程、需後端，留 Phase 1）。
- 安裝引導：偵測非 standalone 時，顯示「Safari → 分享 → 加入主畫面」提示。

---

## 8. 建議建置順序（任務清單）

1. Scaffold + Tailwind + `vite-plugin-pwa`（可安裝、可離線的空殼）。
2. Dexie 資料層（`db.ts` / `images.ts` 壓縮存取）。
3. 底部導覽 + 路由骨架 + onboarding 導向邏輯。
4. Onboarding：生辰輸入 → 八字喜忌（§6.2）→ 五行揭曉 → 上傳第一件 → 通知佔位。
5. **新增衣物**（§5.1，最難先攻）：去背 → 抽色 → 五行 → 表單 → 壓縮入庫。
6. 衣櫥列表 + 篩選/搜尋 + `ItemCard`。
7. 單品詳情 / 編輯（含 wearCount＋1、CPW 顯示）。
8. 穿搭組合建立 + 列表 + `OutfitDetailSheet`。
9. 今日開運穿搭首頁（農民曆 + 天氣 + 推薦，§5.2 / §6.3）。
10. 穿著統計（§5.4）。
11. 轉售畫面（§5.5，本機草稿）。
12. IG 匯出（§5.6）。
13. PWA 收尾：manifest/icons、安裝引導、離線測試、圖片壓縮校正。

---

## 9. 風險 / 注意

- ⚠️ **去背套件授權：** `@imgly/background-removal` 為 AGPL（自用沒問題）。若日後**商業化、閉源發行**，需改用其商業授權或換成可商用授權的模型（注意 RMBG-1.4 等免費權重多為非商用）。先自用 OK，商業化前再處理。
- ⚠️ **lunar-javascript API：** 方法名請以官方文件 / Context7 確認，勿憑記憶。
- ⚠️ **命理免責：** 喜忌為簡化模型，UI 標示「僅供參考」。
- ⚠️ **iOS 儲存配額：** 照片多易觸頂，務必壓縮（最長邊 1080px / webp），並在「我的」提供**匯出 / 匯入**（JSON + 圖片）作安全網。
- ⚠️ **首次載模型較慢：** 去背模型首載數十 MB，務必進度提示 + 可跳過，別卡住建檔。
- ⚠️ **資料只在本機：** 清除瀏覽器資料或換機會遺失，靠匯出/匯入補救。
