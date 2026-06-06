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

// 由「日曆季節 + 今日溫度」推出有效季節：很熱(≥28°)→夏、很冷(≤15°)→冬，其餘用日曆季節。
// 讓「今日宜穿」跟著天氣走，而不是只看月份。
export function effectiveSeason(weather?: { tempC: number }, d: Date = new Date()): Season {
  const cal = seasonOfDate(d);
  if (!weather) return cal;
  if (weather.tempC >= 28) return '夏';
  if (weather.tempC <= 15) return '冬';
  return cal;
}

// 今日宜穿評分：今日幸運五行 +3、命主喜用 +2、當季 +1、忌用 -2、雨天外套 +1。
export function scoreItem(
  i: Item,
  luckyWuxing: WuXing[],
  favorable: WuXing[],
  unfavorable: WuXing[],
  season: Season,
  opts: { rainy?: boolean } = {}
): number {
  let s = 0;
  if (luckyWuxing.includes(i.wuxing)) s += 3;
  if (favorable.includes(i.wuxing)) s += 2;
  if (i.season === season || i.season === '四季') s += 1;
  if (unfavorable.includes(i.wuxing)) s -= 2;
  if (opts.rainy && i.category === '外套') s += 1; // 雨天加件外套
  return s;
}

// 從各類別挑最高分單品，組一套今日建議。
// 傳入 weather 時：用溫度推有效季節、降雨機率≥50% 視為雨天（外套加分）。
export function recommendOutfit(
  items: Item[],
  luckyWuxing: WuXing[],
  favorable: WuXing[],
  unfavorable: WuXing[],
  season?: Season,
  weather?: { tempC: number; rainProbPct: number }
): Item[] {
  const eff = season ?? effectiveSeason(weather);
  const opts = { rainy: (weather?.rainProbPct ?? 0) >= 50 };
  const byCat = new Map<string, Item>();
  for (const i of items) {
    const s = scoreItem(i, luckyWuxing, favorable, unfavorable, eff, opts);
    const cur = byCat.get(i.category);
    if (!cur || s > scoreItem(cur, luckyWuxing, favorable, unfavorable, eff, opts)) {
      byCat.set(i.category, i);
    }
  }
  return [...byCat.values()];
}
