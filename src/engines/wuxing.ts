// 五行引擎：①顏色 → 五行（純函式，全 App 共用）②生辰 → 八字喜忌（簡化「補不足」法）。
// ⚠️ 喜忌為簡化命理模型，UI 須標示「僅供參考」。lunar-javascript API 已於本專案驗證。
import Lunar from 'lunar-javascript';
import { COLOR_ANCHORS } from '../constants/colors';
import type { WuXing } from '../db/db';

const { Solar } = Lunar;

export function colorToWuxing(hex: string): { colorName: string; wuxing: WuXing } {
  const [r, g, b] = hexToRgb(hex);
  let best = COLOR_ANCHORS[0];
  let bestD = Infinity;
  for (const a of COLOR_ANCHORS) {
    const [ar, ag, ab] = hexToRgb(a.hex);
    const d = (r - ar) ** 2 + (g - ag) ** 2 + (b - ab) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return { colorName: best.name, wuxing: best.wuxing };
}

export interface BaziResult {
  dayMasterWuxing: WuXing;
  wuxingCount: Record<WuXing, number>;
  favorable: WuXing[];
  unfavorable: WuXing[];
}

const GAN_WX: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_WX: Record<string, WuXing> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

// birthDate: 'YYYY-MM-DD'；birthHour 可選（缺時用三柱，不算時柱以免偏誤）。
export function computeBazi(birthDate: string, birthHour?: number): BaziResult {
  const [y, m, d] = birthDate.split('-').map(Number);
  const hour = birthHour ?? 12;
  const solar = Solar.fromYmdHms(y, m, d, hour, 0, 0);
  const ec = solar.getLunar().getEightChar();

  const pillars: string[] = [ec.getYear(), ec.getMonth(), ec.getDay()];
  if (birthHour != null) pillars.push(ec.getTime());

  const count: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  let dayMaster: WuXing = '土';

  pillars.forEach((p, idx) => {
    const gan = p.charAt(0);
    const zhi = p.charAt(1);
    const gw = GAN_WX[gan];
    const zw = ZHI_WX[zhi];
    if (gw) count[gw]++;
    if (zw) count[zw]++;
    if (idx === 2 && gw) dayMaster = gw; // 日干 = 命主
  });

  const entries = Object.entries(count) as [WuXing, number][];
  const min = Math.min(...entries.map((e) => e[1]));
  const max = Math.max(...entries.map((e) => e[1]));
  const favorable = entries.filter((e) => e[1] === min).map((e) => e[0]);
  const unfavorable = entries.filter((e) => e[1] === max).map((e) => e[0]);

  return { dayMasterWuxing: dayMaster, wuxingCount: count, favorable, unfavorable };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}
