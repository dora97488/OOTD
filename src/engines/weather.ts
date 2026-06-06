// 天氣引擎 —— 佔位實作。
// TODO(天氣負責人)：接中央氣象署(CWA)開放資料 API（需免費 key）；海外用 OpenWeather。
//                  用 getCoords() 取得定位後查當地今日天氣。
export interface WeatherInfo {
  tempC: number;
  feelsLikeC: number;
  rainProbPct: number;
  desc: string;
}

export async function getCurrentWeather(_lat?: number, _lng?: number): Promise<WeatherInfo> {
  // 佔位資料，讓首頁可先渲染版型。實作時換成真 API 回應。
  return { tempC: 24, feelsLikeC: 25, rainProbPct: 20, desc: '晴時多雲' };
}

// 定位屬「平台能力」，實作收斂在 platform/capabilities.ts；此處 re-export 維持既有匯入路徑。
export { getCoords } from '../platform/capabilities';
