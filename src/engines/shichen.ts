// 時辰換算（共用）—— 0-23 時 → 十二時辰名。
// 每時辰 2 小時，子時跨 23:00–01:00。供 Profile 顯示與 Onboarding/編輯的即時提示用。
const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function hourToShichen(hour?: number): string {
  if (hour == null) return '時辰未填';
  return `${SHICHEN[Math.floor(((hour + 1) % 24) / 2)]}時`;
}
