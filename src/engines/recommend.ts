// 推薦引擎（純函式，全 App 共用）：CPW、建議轉售、今日宜穿評分。
import type { Item, Season, WuXing } from '../db/db';

const DAY = 24 * 3600 * 1000;

export function cpw(i: Item): number {
  return (i.price ?? 0) / Math.max(i.wearCount, 1);
}

// 久未穿（>90 天）或買了幾乎沒穿 → 建議轉售。
export function suggestResale(items: Item[], unwornDays = 90): Item[] {
  const now = Date.now();
  return items.filter((i) => {
    const ref = i.lastWornAt ?? i.createdAt;
    const longUnused = now - ref > unwornDays * DAY;
    const boughtUnworn = !!i.price && i.price > 0 && i.wearCount <= 1;
    return longUnused || boughtUnworn;
  });
}

export function seasonOfDate(d: Date = new Date()): Season {
  const m = d.getMonth() + 1;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}

// 今日宜穿評分：今日幸運五行 +3、命主喜用 +2、當季 +1、忌用 -2。
export function scoreItem(
  i: Item,
  luckyWuxing: WuXing[],
  favorable: WuXing[],
  unfavorable: WuXing[],
  season: Season
): number {
  let s = 0;
  if (luckyWuxing.includes(i.wuxing)) s += 3;
  if (favorable.includes(i.wuxing)) s += 2;
  if (matchesSeason(i.season, season)) s += 1;
  if (unfavorable.includes(i.wuxing)) s -= 2;
  return s;
}

function matchesSeason(itemSeason: Season, currentSeason: Season): boolean {
  if (itemSeason === '四季') return true;
  if (itemSeason === currentSeason) return true;
  if (currentSeason.length === 1 && itemSeason.includes(currentSeason)) return true;
  if (itemSeason.length === 1 && currentSeason.includes(itemSeason)) return true;
  return false;
}

// 從各類別挑最高分單品，組一套今日建議。
export function recommendOutfit(
  items: Item[],
  luckyWuxing: WuXing[],
  favorable: WuXing[],
  unfavorable: WuXing[],
  season: Season = seasonOfDate()
): Item[] {
  const byCat = new Map<string, Item>();
  for (const i of items) {
    const s = scoreItem(i, luckyWuxing, favorable, unfavorable, season);
    const cur = byCat.get(i.category);
    if (!cur || s > scoreItem(cur, luckyWuxing, favorable, unfavorable, season)) {
      byCat.set(i.category, i);
    }
  }
  return [...byCat.values()];
}
