// 二手市集（mock，Phase 0「先做皮」）—— 「逛逛別人的衣櫥」。
// ⚠️ 純假資料、無後端、無金流；日後接市集 API 只改本檔，screen 不動（data 層 swap-point）。
// 圖片直接用 public/seed/ 的單品照（與衣櫥示範同源），透過 marketImageURL() 取相對路徑。
import type { WuXing, Category } from '../db/db';

export interface MarketListing {
  id: string;
  name: string;
  price: number;       // NT$
  seller: string;      // @handle
  image?: string;      // public/seed/ 下的檔名；有圖就顯示真圖
  emoji: string;       // 無真圖時的 fallback 縮圖
  wuxing: WuXing;      // 用於「搭配你的五行」適配度
  category: Category;
  desc: string;
}

const MARKET: MarketListing[] = [
  { id: 'm1', name: '藍色荷葉細肩上衣', price: 480, seller: '@minimal_closet', image: 'summer.png',      emoji: '👚', wuxing: '水', category: '上衣', desc: '水洗丹寧質感荷葉上衣，層次剪裁、隨性有型，九成新。' },
  { id: 'm2', name: '棉麻寬版襯衫',     price: 520, seller: '@yoyo.wears',     image: 'shirt-4.png',     emoji: '👔', wuxing: '土', category: '上衣', desc: '透氣棉麻寬版襯衫，溫柔顯白、四季百搭，多色可選。僅試穿過一次。' },
  { id: 'm3', name: '淺灰棉質長袖',     price: 380, seller: '@daily.muji',    image: 'shirt-3.png',     emoji: '👕', wuxing: '金', category: '上衣', desc: '厚磅純棉長袖，不透不變形，百搭基本款。' },
  { id: 'm4', name: '靛藍直筒長褲',     price: 420, seller: '@indigo.days',   image: 'pants-1.png',     emoji: '👖', wuxing: '水', category: '下身', desc: '深靛直筒長褲，顯瘦遮肉、版型俐落，少穿出清。' },
  { id: 'm5', name: '卡其寬褲',         price: 360, seller: '@trench.lover',  image: 'pants-brown.png', emoji: '👖', wuxing: '土', category: '下身', desc: '高腰卡其寬褲，質料挺拔、顯腿長，氣場全開。' },
  { id: 'm6', name: '水藍無袖長洋裝',   price: 680, seller: '@mint.studio',   image: 'dress-3.png',     emoji: '👗', wuxing: '水', category: '洋裝', desc: '清新水藍長洋裝，垂墜感佳，春夏約會首選。' },
  { id: 'm7', name: '鵝黃襯衫洋裝',     price: 450, seller: '@wine.knit',     image: 'dress-4.png',     emoji: '👗', wuxing: '土', category: '洋裝', desc: '溫柔鵝黃襯衫洋裝，提亮氣色、優雅好穿。' },
  { id: 'm8', name: '黑色棉質長裙',     price: 320, seller: '@boots.daily',   image: 'skirt-1.png',     emoji: '👗', wuxing: '水', category: '下身', desc: '簡約黑色長裙，四季皆宜、好搭百搭。' },
];

/** 市集清單（Phase 0 回傳 mock；之後接後端只改這裡）。 */
export function listMarket(): MarketListing[] {
  return MARKET;
}

/** 市集圖片的相對 URL（指向 public/seed/，相容 GitHub Pages / Capacitor 的 base）。 */
export function marketImageURL(file?: string): string | undefined {
  return file ? `${import.meta.env.BASE_URL}seed/${file}` : undefined;
}
