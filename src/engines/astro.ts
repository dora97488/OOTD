// 西洋本命盤引擎：circular-natal-horoscope-js（純前端、免 key、離線；Unlicense 可商用）。
// 只做盤面計算、不含文字解讀（解讀之後交 Claude API）。不依賴 db（避免循環）。
// ⚠️ 西洋四元素與中式五行是兩套系統，不要互相劃等號 —— 故用英文 Fire/Earth/Air/Water 標示。
import { Origin, Horoscope } from 'circular-natal-horoscope-js';

export type WesternElement = 'Fire' | 'Earth' | 'Air' | 'Water';

export interface NatalInput {
  date: string; // 'YYYY-MM-DD'
  hour: number; // 0-23
  minute: number; // 0-59
  lat: number;
  lng: number;
}

export interface AstroResult {
  sunSign: string; // 太陽星座（英文，如 'Aries'）
  moonSign: string; // 月亮星座
  risingSign: string; // 上升星座（需出生時間＋地點才算得出）
  westernElement: WesternElement; // 由太陽星座對應
}

const SIGN_ELEMENT: Record<string, WesternElement> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export function computeNatalChart(input: NatalInput): AstroResult {
  const [y, m, d] = input.date.split('-').map(Number);

  // ⚠️ Origin 的 month 是 0-indexed（1 月 = 0），務必 m - 1。
  const origin = new Origin({
    year: y,
    month: m - 1,
    date: d,
    hour: input.hour,
    minute: input.minute,
    latitude: input.lat,
    longitude: input.lng,
  });

  const horoscope = new Horoscope({
    origin,
    houseSystem: 'whole-sign',
    zodiac: 'tropical',
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ['major'],
    language: 'en',
  });

  // CelestialBodies / Ascendant 在型別上是 any，故以 any 取值並做防呆。
  const bodies = horoscope.CelestialBodies as any;
  const asc = horoscope.Ascendant as any;
  const sunSign = String(bodies?.sun?.Sign?.label ?? '');
  const moonSign = String(bodies?.moon?.Sign?.label ?? '');
  const risingSign = String(asc?.Sign?.label ?? '');

  return {
    sunSign,
    moonSign,
    risingSign,
    westernElement: SIGN_ELEMENT[sunSign] ?? 'Fire',
  };
}
