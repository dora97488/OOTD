// 顏色 ↔ 五行 對照（可被使用者設定覆寫）。各流派對「紫」歸火/水有出入，先採此版。
import type { WuXing } from '../db/db';

export interface ColorAnchor { hex: string; name: string; wuxing: WuXing; }

export const COLOR_ANCHORS: ColorAnchor[] = [
  { hex: '#2e7d32', name: '綠', wuxing: '木' },
  { hex: '#00897b', name: '青綠', wuxing: '木' },
  { hex: '#d32f2f', name: '紅', wuxing: '火' },
  { hex: '#f57c00', name: '橙', wuxing: '火' },
  { hex: '#8e24aa', name: '紫', wuxing: '火' },
  { hex: '#e91e63', name: '粉紅', wuxing: '火' },
  { hex: '#fbc02d', name: '黃', wuxing: '土' },
  { hex: '#6d4c41', name: '咖啡', wuxing: '土' },
  { hex: '#d7ccc8', name: '米色', wuxing: '土' },
  { hex: '#ffffff', name: '白', wuxing: '金' },
  { hex: '#bdbdbd', name: '灰', wuxing: '金' },
  { hex: '#cfd8dc', name: '銀', wuxing: '金' },
  { hex: '#000000', name: '黑', wuxing: '水' },
  { hex: '#1565c0', name: '藍', wuxing: '水' },
  { hex: '#0d47a1', name: '藏青', wuxing: '水' },
];

// UI 用：每個五行的「顯示 swatch」色（已和諧 Editorial Vibe 點綴色；對應 index.css 的 CSS 變數）。
// ⚠️ 上方 COLOR_ANCHORS 是「分類用」錨點（照片主色 → 五行），與此顯示色無關，兩者不要混用。
export const WUXING_HEX: Record<WuXing, string> = {
  木: '#8FA66B', // 葉綠
  火: '#D84A2B', // 番茄紅
  土: '#C5A24B', // 金
  金: '#A8A29A', // 暖銀灰
  水: '#202638', // 深藍
};
