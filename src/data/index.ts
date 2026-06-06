// =============================================================
// 資料層入口（barrel）—— screens / components 一律從 '../data' 取用資料操作，
// 不要直接呼叫 db.*。這是未來接後端的唯一 swap point：
// 換成 Supabase 等後端時，只改 data/ 內各檔的實作，畫面層完全不動。
//
// 共用「型別」仍由 db/db.ts 提供（型別的唯一來源），需要時 `import type { Item } from '../db/db'`。
// =============================================================
export * from './items';
export * from './outfits';
export * from './profile';
export * from './listings';
export * from './wearlogs';
export * from './images';
export * from './backup';
