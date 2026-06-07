// =============================================================
// 共用資料層 (IndexedDB via Dexie) —— 全 App 的底層儲存與型別來源。
// ⚠️ screens / components 請一律透過 src/data/ 的資料 API 讀寫，不要直接用 db.*。
//    db.* 只在 data/ 層內部使用（單一 swap point，日後接後端只改 data/）。
// 圖片以 blob 存在 images 表，透過 data/ 的 storeImage / getImageURL 存取。
// =============================================================
import Dexie, { type Table } from 'dexie';
import type { AstroResult } from '../engines/astro';

export type WuXing = '木' | '火' | '土' | '金' | '水';
export type Category = '上衣' | '下身' | '外套' | '洋裝' | '鞋' | '配件';
export type Season = '春' | '夏' | '秋' | '冬' | '四季' | '春夏' | '春秋' | '秋冬';

export const CATEGORIES: Category[] = ['上衣', '下身', '外套', '洋裝', '鞋', '配件'];
export const SEASONS: Season[] = ['四季', '春夏', '春秋', '秋冬'];

export interface Item {
  id: string;
  name?: string;            // 衣物名稱（網格與單品 Sheet 顯示；選填）
  imageId: string;          // 去背後圖片 → images 表
  originalId?: string;      // 原圖（可選）
  category: Category;
  mainColorHex: string;     // 自動抽取主色
  colorName: string;        // 主色命名
  wuxing: WuXing;           // 由顏色對應（engines/wuxing）
  season: Season;
  material?: string;
  brand?: string;
  price?: number;           // CPW 計算用
  tags: string[];
  wearCount: number;
  lastWornAt?: number;
  createdAt: number;
}

export interface Outfit {
  id: string;
  name: string;
  itemIds: string[];
  coverWuxing?: WuXing;
  suitableSeason?: Season;
  suitableWeather?: string;
  scheduledDate?: string;   // YYYY-MM-DD（行事曆/穿搭日曆）
  tripId?: string;
  createdAt: number;
}

// 出生地（星盤上升/宮位用）。與天氣的 TW_CITIES 不同用途。
export interface BirthPlace { name: string; lat: number; lng: number; }

export interface Profile {
  id: string;               // 固定為 'me'
  nickname?: string;        // 暱稱（個人檔案顯示；選填）
  avatarImageId?: string;   // 頭像 → images 表（選填；空則用暱稱首字 fallback）
  mode: 'bazi' | 'astro' | 'hybrid'; // 占卜原理偏好：五行 / 占星 / 混合（分層）
  birthDate: string;        // YYYY-MM-DD
  birthHour?: number;       // 0-23
  birthMinute?: number;     // 0-59（搭配 birthHour，星盤用）
  dayMasterWuxing?: WuXing;
  wuxingCount?: Record<WuXing, number>;
  favorable: WuXing[];      // 喜用（建議多穿色的五行）
  unfavorable: WuXing[];    // 忌
  zodiacSign?: string;      // 舊欄位（未用，由 astro.sunSign 取代）
  birthPlace?: BirthPlace;  // 出生地（星盤需要；缺則只有五行）
  astro?: AstroResult;      // 星盤結果（時辰＋地點齊全才有）
  weatherCity?: string;     // 天氣偏好縣市（手動覆寫；空＝用 GPS 自動定位）
  notifyMorning?: boolean;  // 每日開運推播 07:30（先做皮：實際排程待 Phase 1）
  notifyEvening?: boolean;  // 記得記錄今日穿搭 21:00
  createdAt: number;
}

export interface ImageBlob { id: string; blob: Blob; }

// 簡易 key-value 設定表（如使用者自填的 OpenAI API key）。
// 走 IndexedDB 而非 localStorage（規範禁用 localStorage）；單一固定 id 取值。
export interface Setting { id: string; value: string; }

// 轉售草稿（Phase 0 僅本機；之後接後端時沿用此結構）。
export interface Listing {
  id: string;
  itemId: string;
  price: number;
  description?: string;
  status: 'draft' | 'listed_local' | 'sold' | 'delisted';
  createdAt: number;
}

// 每日「實際穿搭」記錄（撐「今天」分頁的記錄/月曆/月度統計；記實際穿的，不是 gen 的建議）。
export interface WearLog {
  id: string;
  date: string;             // YYYY-MM-DD（每日一筆，重拍即覆寫同日）
  imageId?: string;         // 整身穿搭照（記實際穿的；點進去再拆解單品）
  itemIds: string[];        // 拆解出的單品（可先空，之後補標）
  wuxingTone?: WuXing;      // 當日五行基調（主導五行）
  note?: string;            // 可回填當天感受 → 餵養運勢驗證閉環
  createdAt: number;
}

export class OOTDDB extends Dexie {
  items!: Table<Item, string>;
  outfits!: Table<Outfit, string>;
  profiles!: Table<Profile, string>;
  images!: Table<ImageBlob, string>;
  listings!: Table<Listing, string>;
  wearlogs!: Table<WearLog, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('ootd');
    this.version(1).stores({
      items: 'id, category, wuxing, season, lastWornAt, createdAt',
      outfits: 'id, scheduledDate, tripId, createdAt',
      profiles: 'id',
      images: 'id',
      listings: 'id, itemId, status',
    });
    // v2：新增每日穿搭記錄表。其餘表未變動，Dexie 自動沿用 v1 schema。
    // 註：Item 新增 name、Category 新增「洋裝」屬「非索引欄位/型別」變更，不需動 schema。
    this.version(2).stores({
      wearlogs: 'id, date, createdAt',
    });
    // v3：新增 key-value 設定表（存使用者自填的 OpenAI API key 等）。其餘表未變動。
    this.version(3).stores({
      settings: 'id',
    });
  }
}

export const db = new OOTDDB();

export const PROFILE_ID = 'me';
