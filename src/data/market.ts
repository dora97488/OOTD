// 二手市集（mock，Phase 0「先做皮」）—— 「逛逛別人的衣櫥」。
// ⚠️ 純假資料、無後端、無金流；日後接市集 API 只改本檔，screen 不動（data 層 swap-point）。
import type { WuXing, Category } from '../db/db';

export interface MarketListing {
  id: string;
  name: string;
  price: number;       // NT$
  seller: string;      // @handle
  emoji: string;       // Phase 0 無真圖，用 emoji 當縮圖
  wuxing: WuXing;      // 用於「搭配你的五行」適配度
  category: Category;
  desc: string;
}

const MARKET: MarketListing[] = [
  { id: 'm1', name: '復古丹寧外套', price: 480, seller: '@minimal_closet', emoji: '🧥', wuxing: '水', category: '外套', desc: '經典水洗丹寧，版型俐落、九成新。隨性一搭就有味道。' },
  { id: 'm2', name: '奶茶色針織', price: 320, seller: '@yoyo.wears', emoji: '🧶', wuxing: '土', category: '上衣', desc: '柔軟奶茶色針織，溫柔顯白，秋冬必備。僅試穿過一次。' },
  { id: 'm3', name: '白棉 T', price: 380, seller: '@daily.muji', emoji: '👕', wuxing: '金', category: '上衣', desc: '厚磅純棉白 T，不透不變形，百搭基本款。' },
  { id: 'm4', name: '深靛牛仔', price: 380, seller: '@indigo.days', emoji: '👖', wuxing: '水', category: '下身', desc: '深靛直筒牛仔，顯瘦遮肉，少穿出清。' },
  { id: 'm5', name: '卡其風衣', price: 680, seller: '@trench.lover', emoji: '🧥', wuxing: '土', category: '外套', desc: '英倫卡其長版風衣，質料挺拔、氣場全開。' },
  { id: 'm6', name: '薄荷洋裝', price: 450, seller: '@mint.studio', emoji: '👗', wuxing: '木', category: '洋裝', desc: '清新薄荷綠洋裝，垂墜感佳，春夏約會首選。' },
  { id: 'm7', name: '酒紅針織衫', price: 290, seller: '@wine.knit', emoji: '🧣', wuxing: '火', category: '上衣', desc: '飽和酒紅針織，氣色提亮，節慶感十足。' },
  { id: 'm8', name: '黑色踝靴', price: 520, seller: '@boots.daily', emoji: '👢', wuxing: '水', category: '鞋', desc: '簡約黑色短靴，跟高好走，四季皆宜。' },
];

/** 市集清單（Phase 0 回傳 mock；之後接後端只改這裡）。 */
export function listMarket(): MarketListing[] {
  return MARKET;
}
