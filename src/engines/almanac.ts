// 農民曆引擎（跨頁共用）：今日干支、宜、忌、今日五行。
// ⚠️ lunar-javascript API 以官方文件為準；吉時細節留農民曆負責人精修。
import Lunar from 'lunar-javascript';
import type { WuXing } from '../db/db';

const { Solar } = Lunar;

const GAN_WX: Record<string, WuXing> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

export interface AlmanacInfo {
  dateLabel: string;     // 國曆
  lunarLabel: string;    // 農曆
  ganzhiDay: string;     // 今日干支
  yi: string[];          // 宜
  ji: string[];          // 忌
  luckyWuxing: WuXing[]; // 今日五行（以日干為主）
}

export function getTodayAlmanac(date: Date = new Date()): AlmanacInfo {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const ganzhiDay = lunar.getDayInGanZhi();
  const dayGan = ganzhiDay.charAt(0);
  const wx = GAN_WX[dayGan];

  return {
    dateLabel: `${solar.getYear()}/${solar.getMonth()}/${solar.getDay()}`,
    lunarLabel: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    ganzhiDay,
    yi: safeArr(lunar.getDayYi()),
    ji: safeArr(lunar.getDayJi()),
    luckyWuxing: wx ? [wx] : [],
  };
}

function safeArr(v: any): string[] {
  return Array.isArray(v) ? v.slice(0, 6) : [];
}
