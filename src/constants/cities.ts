// 出生地城市座標（離線用）：給 onboarding 選出生地，算星盤上升星座。
// ⚠️ 與 engines/weather.ts 的 TW_CITIES（22 縣市中心點、天氣用）是兩套不同用途，分開維護。
//    出生地需要城市級精確經緯度（上升星座對地點敏感），且包含海外。
import type { BirthPlace } from '../db/db';

export const CITIES: BirthPlace[] = [
  { name: '台北', lat: 25.033, lng: 121.5654 },
  { name: '新北', lat: 25.0169, lng: 121.4628 },
  { name: '桃園', lat: 24.9936, lng: 121.301 },
  { name: '台中', lat: 24.1477, lng: 120.6736 },
  { name: '台南', lat: 22.9999, lng: 120.227 },
  { name: '高雄', lat: 22.6273, lng: 120.3014 },
  { name: '新竹', lat: 24.8138, lng: 120.9675 },
  { name: '花蓮', lat: 23.9871, lng: 121.6015 },
  { name: '台東', lat: 22.7583, lng: 121.1444 },
  { name: '香港', lat: 22.3193, lng: 114.1694 },
  { name: '東京', lat: 35.6762, lng: 139.6503 },
  // 可擴充
];
