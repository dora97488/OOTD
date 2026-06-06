// =============================================================
// 天氣引擎 —— 中央氣象署(CWA)開放資料 F-C0032-001（今明 36 小時縣市預報）。
// 純前端直接呼叫；需免費 API key（放 .env.local 的 VITE_CWA_API_KEY，見 .env.local.example）。
// 沒 key 或呼叫失敗 → 回佔位資料，App 照常渲染（不卡首頁）。
// WeatherInfo 介面固定（CLAUDE.md 慣例），各頁只依賴它。
// TODO(天氣負責人)：feelsLike 目前以平均溫近似；要真體感可改接鄉鎮預報(F-D0047-xxx，含 AT)；海外可加 OpenWeather。
// =============================================================

export interface WeatherInfo {
  tempC: number;
  feelsLikeC: number;
  rainProbPct: number;
  desc: string;
}

// 定位屬「平台能力」，實作收斂在 platform/capabilities.ts；此處 re-export 維持既有匯入路徑。
export { getCoords } from '../platform/capabilities';

// CWA F-C0032-001 的 locationName 必須是「縣市」名稱（用「臺」非「台」）。座標為各縣市概略中心點。
export const TW_CITIES: { name: string; lat: number; lng: number }[] = [
  { name: '臺北市', lat: 25.04, lng: 121.56 },
  { name: '新北市', lat: 25.01, lng: 121.46 },
  { name: '基隆市', lat: 25.13, lng: 121.74 },
  { name: '桃園市', lat: 24.99, lng: 121.30 },
  { name: '新竹市', lat: 24.80, lng: 120.97 },
  { name: '新竹縣', lat: 24.70, lng: 121.12 },
  { name: '苗栗縣', lat: 24.49, lng: 120.91 },
  { name: '臺中市', lat: 24.15, lng: 120.67 },
  { name: '彰化縣', lat: 24.05, lng: 120.52 },
  { name: '南投縣', lat: 23.91, lng: 120.69 },
  { name: '雲林縣', lat: 23.71, lng: 120.43 },
  { name: '嘉義市', lat: 23.48, lng: 120.45 },
  { name: '嘉義縣', lat: 23.45, lng: 120.25 },
  { name: '臺南市', lat: 23.00, lng: 120.21 },
  { name: '高雄市', lat: 22.63, lng: 120.30 },
  { name: '屏東縣', lat: 22.55, lng: 120.55 },
  { name: '宜蘭縣', lat: 24.70, lng: 121.74 },
  { name: '花蓮縣', lat: 23.99, lng: 121.60 },
  { name: '臺東縣', lat: 22.79, lng: 121.11 },
  { name: '澎湖縣', lat: 23.57, lng: 119.58 },
  { name: '金門縣', lat: 24.43, lng: 118.32 },
  { name: '連江縣', lat: 26.16, lng: 119.95 },
];

export const CITY_NAMES: string[] = TW_CITIES.map((c) => c.name);
export const DEFAULT_CITY = '臺北市';

/** 經緯度 → 最近縣市（純距離比對，免額外 geocoding API）。 */
export function nearestCity(lat: number, lng: number): string {
  let best = DEFAULT_CITY;
  let bestD = Infinity;
  for (const c of TW_CITIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c.name;
    }
  }
  return best;
}

const CWA_KEY = import.meta.env.VITE_CWA_API_KEY as string | undefined;
const CWA_ENDPOINT = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001';
const FALLBACK: WeatherInfo = { tempC: 24, feelsLikeC: 25, rainProbPct: 20, desc: '晴時多雲' };

/** 查某縣市今日天氣。沒 key / 失敗 → 回佔位資料（不讓首頁卡住）。 */
export async function getWeatherByCity(city: string): Promise<WeatherInfo> {
  if (!CWA_KEY) {
    console.warn('[weather] 未設定 VITE_CWA_API_KEY，先回佔位資料。見 .env.local.example。');
    return FALLBACK;
  }
  try {
    const url =
      `${CWA_ENDPOINT}?Authorization=${encodeURIComponent(CWA_KEY)}` +
      `&locationName=${encodeURIComponent(city)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CWA HTTP ${res.status}`);
    return parseCwa(await res.json());
  } catch (e) {
    console.warn('[weather] CWA 呼叫失敗，回佔位資料：', e);
    return FALLBACK;
  }
}

/** 依定位查天氣（向後相容舊簽名）；無座標用預設縣市。 */
export async function getCurrentWeather(lat?: number, lng?: number): Promise<WeatherInfo> {
  const city = lat != null && lng != null ? nearestCity(lat, lng) : DEFAULT_CITY;
  return getWeatherByCity(city);
}

// F-C0032-001 結構：records.location[0].weatherElement[]（各有 elementName 與 time[].parameter.parameterName）。
function parseCwa(json: any): WeatherInfo {
  const loc = json?.records?.location?.[0];
  const pick = (name: string): string | undefined =>
    loc?.weatherElement?.find((el: any) => el.elementName === name)?.time?.[0]?.parameter?.parameterName;

  const wx = pick('Wx') ?? '—';
  const pop = Number(pick('PoP'));
  const minT = Number(pick('MinT'));
  const maxT = Number(pick('MaxT'));
  const avg = Number.isFinite(minT) && Number.isFinite(maxT) ? Math.round((minT + maxT) / 2) : NaN;

  return {
    tempC: Number.isFinite(avg) ? avg : FALLBACK.tempC,
    feelsLikeC: Number.isFinite(avg) ? avg : FALLBACK.feelsLikeC, // 縣市36hr無體感，先以平均溫近似
    rainProbPct: Number.isFinite(pop) ? pop : 0,
    desc: wx,
  };
}
