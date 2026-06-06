// 衣櫥統計（純函式，吃 Item[]）—— 供 Profile「穿著統計」用。
// CPW 公式與 recommend.ts 一致：price / max(wearCount, 1)。
import { CATEGORIES } from '../db/db';
import type { Item, Category, WuXing } from '../db/db';

const WUXING_KEYS: WuXing[] = ['木', '火', '土', '金', '水'];

export interface ClosetStats {
  totalItems: number;
  byCategory: Record<Category, number>;
  byWuxing: Record<WuXing, number>;
  totalWears: number;
  avgCpw: number | null; // 平均每次穿著成本；無任何含價單品時為 null
  mostWorn?: Item;       // 最常穿（wearCount > 0 才有）
}

// 單品 CPW；無價格回 null（不納入平均）。
function itemCpw(i: Item): number | null {
  if (i.price == null) return null;
  return i.price / Math.max(i.wearCount, 1);
}

export function closetStats(items: Item[]): ClosetStats {
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const byWuxing = Object.fromEntries(WUXING_KEYS.map((w) => [w, 0])) as Record<WuXing, number>;
  let totalWears = 0;
  let cpwSum = 0;
  let cpwCount = 0;
  let mostWorn: Item | undefined;

  for (const it of items) {
    byCategory[it.category] = (byCategory[it.category] ?? 0) + 1;
    byWuxing[it.wuxing] = (byWuxing[it.wuxing] ?? 0) + 1;
    totalWears += it.wearCount;
    const c = itemCpw(it);
    if (c != null) {
      cpwSum += c;
      cpwCount += 1;
    }
    if (!mostWorn || it.wearCount > mostWorn.wearCount) mostWorn = it;
  }

  return {
    totalItems: items.length,
    byCategory,
    byWuxing,
    totalWears,
    avgCpw: cpwCount ? cpwSum / cpwCount : null,
    mostWorn: mostWorn && mostWorn.wearCount > 0 ? mostWorn : undefined,
  };
}
