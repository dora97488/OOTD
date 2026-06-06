import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { type Item } from '../db/db';
import { getTodayAlmanac, type AlmanacInfo } from '../engines/almanac';
import { getWeatherByCity, getCoords, nearestCity, CITY_NAMES, DEFAULT_CITY, type WeatherInfo } from '../engines/weather';
import { recommendOutfit } from '../engines/recommend';
import { listItems, getProfile, getImageURL, updateProfile } from '../data';
import { WUXING_HEX } from '../constants/colors';

export default function Home() {
  const profile = useLiveQuery(() => getProfile());
  const items = useLiveQuery(() => listItems(), [], []);
  const [almanac, setAlmanac] = useState<AlmanacInfo>();
  const [weather, setWeather] = useState<WeatherInfo>();
  const [city, setCity] = useState<string>();

  useEffect(() => { setAlmanac(getTodayAlmanac()); }, []);

  // 解析縣市：手動覆寫(profile.weatherCity)優先 → GPS 最近縣市 → 預設縣市
  useEffect(() => {
    let alive = true;
    (async () => {
      let resolved = profile?.weatherCity;
      if (!resolved) {
        const c = await getCoords();
        resolved = c ? nearestCity(c.lat, c.lng) : DEFAULT_CITY;
      }
      if (alive) setCity(resolved);
    })();
    return () => { alive = false; };
  }, [profile?.weatherCity]);

  // 依解析出的縣市查 CWA 天氣
  useEffect(() => {
    if (!city) return;
    let alive = true;
    getWeatherByCity(city).then((w) => { if (alive) setWeather(w); });
    return () => { alive = false; };
  }, [city]);

  const lucky = almanac?.luckyWuxing ?? [];
  const fav = profile?.favorable ?? [];
  const unfav = profile?.unfavorable ?? [];
  const suggestion = recommendOutfit(items, lucky, fav, unfav);

  return (
    <div className="px-5 pt-6">
      <h1 className="font-serif text-2xl text-ink">今日開運穿搭</h1>

      {/* 農民曆卡（真資料） */}
      {almanac && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-xl text-seal">{almanac.ganzhiDay}日</span>
            <span className="text-sm text-muted">{almanac.dateLabel}・農曆{almanac.lunarLabel}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-wood">宜</span>　<span className="text-muted">{almanac.yi.join('、') || '—'}</span></div>
            <div><span className="text-fire">忌</span>　<span className="text-muted">{almanac.ji.join('、') || '—'}</span></div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted">今日五行</span>
            {lucky.map((w) => (
              <span key={w} className="chip" style={{ color: WUXING_HEX[w], borderColor: WUXING_HEX[w] }}>{w}</span>
            ))}
          </div>
        </div>
      )}

      {/* 天氣列（CWA 真資料；縣市 GPS 自動，可手動覆寫存 profile.weatherCity） */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-card px-5 py-3 text-sm shadow-card">
        <span className="font-serif text-xl text-ink">{weather ? `${weather.tempC}°` : '—'}</span>
        <span className="text-muted">{weather?.desc ?? '—'}</span>
        <span className="text-muted">降雨 {weather?.rainProbPct ?? '—'}%</span>
        <select
          value={city ?? ''}
          onChange={(e) => updateProfile({ weatherCity: e.target.value })}
          className="ml-auto rounded-lg border border-line bg-paper px-2 py-1 text-xs text-muted"
          aria-label="選擇縣市"
        >
          {!city && <option value="">定位中…</option>}
          {CITY_NAMES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 今日建議（用共用 recommend 引擎） */}
      <h2 className="mt-7 font-serif text-lg text-ink">為你挑的開運搭配</h2>
      {suggestion.length === 0 ? (
        <p className="mt-2 text-sm text-muted">衣櫥還沒有衣服，先去新增幾件，這裡就會自動挑出今日最旺搭配。</p>
      ) : (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {suggestion.map((it) => <SuggestCard key={it.id} item={it} />)}
        </div>
      )}

      {/* TODO(首頁負責人)：開運穿搭卡細化、穿搭詳情 Sheet（五行解析）、七日行事曆(P1) */}
    </div>
  );
}

function SuggestCard({ item }: { item: Item }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let revoke: string | undefined;
    getImageURL(item.imageId).then((u) => { revoke = u; setUrl(u); });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item.imageId]);
  return (
    <div className="w-28 shrink-0">
      <div className="aspect-square overflow-hidden rounded-xl border border-line bg-paper">
        {url && <img src={url} className="h-full w-full object-contain" />}
      </div>
      <div className="mt-1 text-center text-xs text-muted">{item.category}</div>
    </div>
  );
}
