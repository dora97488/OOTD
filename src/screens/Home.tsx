import { startTransition, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { type Item, type Profile, type WearLog, type WuXing } from '../db/db';
import { getTodayAlmanac, type AlmanacInfo } from '../engines/almanac';
import { getWeatherByCity, getCoords, nearestCity, CITY_NAMES, DEFAULT_CITY, type WeatherInfo } from '../engines/weather';
import { recommendOutfit } from '../engines/recommend';
import { WUXING_HEX } from '../constants/colors';
import {
  listItems,
  getProfile,
  getImageBlob,
  getImageURL,
  listWearLogsInMonth,
  getWearLogByDate,
  saveWearLog,
  storeImage,
  updateProfile,
} from '../data';

// ── 拼貼動畫位置（洗牌 → 揭曉，沿用原本設計）──
const SHUFFLE_POSITIONS = [
  { x: '8%', y: '8%', rotate: -18, scale: 0.92, driftX: 34, driftY: 28, driftRotate: 10 },
  { x: '54%', y: '6%', rotate: 12, scale: 0.9, driftX: -28, driftY: 40, driftRotate: -12 },
  { x: '62%', y: '34%', rotate: 18, scale: 0.94, driftX: -36, driftY: -20, driftRotate: 8 },
];
const REVEAL_POSITIONS = [
  { x: '8%', y: '8%', rotate: -8, scale: 1, width: '38%' },
  { x: '52%', y: '12%', rotate: 7, scale: 1, width: '36%' },
  { x: '30%', y: '50%', rotate: -4, scale: 1, width: '38%' },
];

const HOME_GARMENT_FILES = import.meta.glob('../../img/processed/home/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

type DemoKind = 'upper' | 'lower' | 'accessory' | 'bag';

function normalizeDemoName(filePath: string) {
  return decodeURIComponent(filePath.split('/').pop() ?? '')
    .replace(/\.png$/i, '')
    .replace(/-(outlined|cutout)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

function demoKindOf(name: string): DemoKind {
  const lower = name.toLowerCase();
  if (
    lower.includes('bag') ||
    lower.includes('包包') ||
    lower.includes('手袋') ||
    lower.includes('托特') ||
    lower.includes('tote')
  ) return 'bag';
  if (
    lower.includes('眼鏡') ||
    lower.includes('墨鏡') ||
    lower.includes('accessory') ||
    lower.includes('sunglass')
  ) return 'accessory';
  if (
    lower.includes('pants') ||
    lower.includes('下身') ||
    lower.includes('長褲') ||
    lower.includes('寬褲')
  ) return 'lower';
  return 'upper';
}

const DEMO_FLOAT_LAYOUTS = [
  { x: '1%', y: '2%', rotate: -12, z: 8 },
  { x: '25%', y: '0%', rotate: -5, z: 10 },
  { x: '50%', y: '2%', rotate: 7, z: 9 },
  { x: '74%', y: '3%', rotate: 11, z: 8 },
  { x: '3%', y: '23%', rotate: -9, z: 11 },
  { x: '27%', y: '24%', rotate: 4, z: 12 },
  { x: '51%', y: '22%', rotate: 8, z: 10 },
  { x: '74%', y: '24%', rotate: 5, z: 11 },
  { x: '1%', y: '47%', rotate: -8, z: 9 },
  { x: '26%', y: '48%', rotate: -3, z: 12 },
  { x: '50%', y: '47%', rotate: 4, z: 10 },
  { x: '74%', y: '48%', rotate: 7, z: 12 },
  { x: '3%', y: '71%', rotate: -6, z: 9 },
  { x: '27%', y: '70%', rotate: -2, z: 10 },
  { x: '51%', y: '71%', rotate: 3, z: 11 },
  { x: '74%', y: '70%', rotate: 6, z: 13 },
];

const DEMO_RECOMMEND_LAYOUT: Record<DemoKind, { x: string; y: string; w: string; h: string; rotate: number; z: number }> = {
  accessory: { x: '2%', y: '5%', w: '36%', h: '17%', rotate: -7, z: 24 },
  upper: { x: '17%', y: '13%', w: '58%', h: '42%', rotate: 1, z: 20 },
  lower: { x: '16%', y: '45%', w: '34%', h: '56%', rotate: 7, z: 23 },
  bag: { x: '43%', y: '44%', w: '50%', h: '36%', rotate: -2, z: 22 },
};

const DEMO_COLLAGE_ITEMS = Array.from(
  Object.entries(HOME_GARMENT_FILES)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-Hant'))
    .reduce((map, [path, src]) => {
      const fileName = decodeURIComponent(path.split('/').pop() ?? '');
      const label = normalizeDemoName(path);
      const key = label.toLowerCase();
      const isPreferred = /outlined/i.test(path);
      const existing = map.get(key);
      if (!existing || isPreferred) {
        map.set(key, {
          fileName,
          src,
          label,
          kind: demoKindOf(label),
        });
      }
      return map;
    }, new Map<string, { fileName: string; src: string; label: string; kind: DemoKind }>())
    .values()
).map((item, index) => ({
  ...item,
  ...DEMO_FLOAT_LAYOUTS[index % DEMO_FLOAT_LAYOUTS.length],
  floatDelay: index * 180,
  floatDuration: 3400 + (index % 5) * 220,
  floatRange: 20 + (index % 4) * 3,
  floatX: ((index % 2 === 0 ? 1 : -1) * (14 + (index % 4) * 4)),
  floatY: ((index % 3 === 0 ? -1 : 1) * (10 + (index % 5) * 3)),
  floatRotate: ((index % 2 === 0 ? 1 : -1) * (2 + (index % 3) * 1.5)),
}));

function findDemoItemByFileName(fileName: string) {
  return DEMO_COLLAGE_ITEMS.find((item) => item.fileName === fileName);
}

const DEMO_RECOMMEND_ITEMS = [
  findDemoItemByFileName('使用者附件-cutout.png'),
  findDemoItemByFileName('pastel-pants-outlined.png'),
  findDemoItemByFileName('使用者附件 (1)-cutout.png'),
  findDemoItemByFileName('striped-bag-outlined.png'),
].filter(Boolean) as Array<(typeof DEMO_COLLAGE_ITEMS)[number]>;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];
const WUXING_TONE_CLASS: Record<WuXing, string> = {
  木: 'text-wood', 火: 'text-fire', 土: 'text-earth', 金: 'text-metal', 水: 'text-water',
};

function ymKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Home() {
  const profile = useLiveQuery(() => getProfile());
  const items = useLiveQuery(() => listItems(), [], []);

  const today = useMemo(() => new Date(), []);

  const [almanac, setAlmanac] = useState<AlmanacInfo>();
  const [weather, setWeather] = useState<WeatherInfo>();
  const [city, setCity] = useState<string>();

  useEffect(() => { setAlmanac(getTodayAlmanac(today)); }, [today]);

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

  // 幸運五行＝今日五行 ∪ 命主喜用（缺資料給 demo 值，方便先看版型）。
  const luckyWuxing = useMemo<WuXing[]>(() => {
    const set = new Set<WuXing>([...(almanac?.luckyWuxing ?? []), ...(profile?.favorable ?? [])]);
    const arr = [...set];
    return arr.length ? arr.slice(0, 3) : ['火', '土'];
  }, [almanac, profile]);

  return (
    <div className="px-4 pt-3 pb-4">
      <header className="brand-banner" aria-label="OOTD 品牌標語">
        <p className="brand-name">OOTD</p>
        <p className="brand-slogan">Your daily outfit prophecy.</p>
      </header>

      <p className="home-note">今日穿搭依據「五行」「占星」</p>

      {/* 天氣列（CWA F-D0047-091 真資料：溫度/天氣/降雨/體感/UV；縣市 GPS 自動，可手動覆寫存 profile.weatherCity） */}
      <div className="mt-3 rounded-2xl border border-line bg-card px-5 py-3 shadow-card">
        <div className="flex items-center gap-3 text-sm">
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
        {weather && (
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
            <span>體感 {weather.feelsLikeC}°</span>
            {weather.uvIndex != null && (
              <span>UV {weather.uvIndex}{weather.uvLevel ? `・${weather.uvLevel}` : ''}</span>
            )}
          </div>
        )}
      </div>

      {/* ── 雙態內容 ── */}
      <SuggestMode
        profile={profile}
        items={items}
        luckyWuxing={luckyWuxing}
        weather={weather}
      />

      {/* ── 月曆 + 月度統計 + 日期 Sheet ── */}
      <CalendarSection items={items} />
    </div>
  );
}

// ════════════════════════════════════════════════════
// 天氣列
// ════════════════════════════════════════════════════
function WeatherBar({ weather }: { weather?: WeatherInfo }) {
  const place = '台北市'; // TODO(天氣負責人)：反向地理編碼自 getCoords()
  return (
    <div className="weather-bar">
      <span className="weather-temp">{weather ? `${weather.tempC}°` : '—'}</span>
      <div className="weather-meta">
        <span className="weather-place">{place}</span>
        <span>{weather?.desc ?? '載入天氣中…'}</span>
      </div>
      <div className="weather-chips">
        <span>體感 {weather ? `${weather.feelsLikeC}°` : '—'}</span>
        <span>降雨 {weather ? `${weather.rainProbPct}%` : '—'}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// 建議模式
// ════════════════════════════════════════════════════
function SuggestMode({
  profile, items, luckyWuxing, weather,
}: {
  profile?: Profile;
  items: Item[];
  luckyWuxing: WuXing[];
  weather?: WeatherInfo;
}) {
  const suggestion = recommendOutfit(items, luckyWuxing, profile?.favorable ?? [], profile?.unfavorable ?? [], undefined, weather);
  const heroItems = (suggestion.length > 0 ? suggestion : items).slice(0, 3);

  // mock 先直接顯示建議拼貼；正式流程再改回需點擊生成。
  const [generated, setGenerated] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const heroKey = heroItems.map((i) => i.id).join('|');

  useEffect(() => {
    if (!generated) { setRevealed(false); return; }
    setRevealed(false);
    const t = window.setTimeout(() => startTransition(() => setRevealed(true)), 1600);
    return () => window.clearTimeout(t);
  }, [generated, heroKey]);

  return (
    <>
      {/* 生成今日建議搭配 */}
      {!generated ? (
        <button type="button" className="cta-primary" onClick={() => setGenerated(true)}>
          生成今日建議搭配
        </button>
      ) : (
        <SuggestionCollage heroItems={heroItems} revealed={revealed} />
      )}
    </>
  );
}

function SuggestionCollage({ heroItems, revealed }: { heroItems: Item[]; revealed: boolean }) {
  if (heroItems.length === 0) {
    return <DemoSuggestionCollage />;
  }
  return (
    <section className="closet-collage" aria-label="今日建議搭配">
      {heroItems.map((item, index) => (
        <CollageCutout key={item.id} item={item} index={index} revealed={revealed} />
      ))}
    </section>
  );
}

function DemoSuggestionCollage() {
  const [showRecommendation, setShowRecommendation] = useState(false);

  useEffect(() => {
    setShowRecommendation(false);
    const timer = window.setTimeout(() => setShowRecommendation(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="closet-collage" aria-label="今日建議搭配（示意）">
      <div className="demo-collage-stage">
        {DEMO_COLLAGE_ITEMS.map((item) => {
          const recommended = DEMO_RECOMMEND_ITEMS.find((pick) => pick.src === item.src);
          const layout = recommended ? DEMO_RECOMMEND_LAYOUT[recommended.kind] : null;
          return (
            <figure
              key={item.src}
              className={`demo-sticker${recommended ? ' is-recommendable' : ''}${showRecommendation && recommended ? ' is-settled' : ''}`}
              style={{
                left: showRecommendation && layout ? layout.x : item.x,
                top: showRecommendation && layout ? layout.y : item.y,
                width: showRecommendation && layout ? layout.w : undefined,
                height: showRecommendation && layout ? layout.h : undefined,
                zIndex: showRecommendation && layout ? layout.z : item.z,
                opacity: showRecommendation && !recommended ? 0 : 1,
                transform: `rotate(${showRecommendation && layout ? layout.rotate : item.rotate}deg) scale(${
                  showRecommendation ? (recommended ? 1 : 0.72) : 1
                })`,
                '--float-delay': `${item.floatDelay}ms`,
                '--float-duration': `${item.floatDuration}ms`,
                '--float-range': `${showRecommendation ? Math.max(10, item.floatRange - 6) : item.floatRange}px`,
                '--float-x': `${showRecommendation ? 0 : item.floatX}px`,
                '--float-y': `${showRecommendation ? 0 : item.floatY}px`,
                '--float-rotate': `${showRecommendation ? 0 : item.floatRotate}deg`,
              } as CSSProperties}
            >
              <div className="demo-sticker-inner">
                <img src={item.src} alt={item.label} />
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function CollageCutout({ item, index, revealed }: { item: Item; index: number; revealed: boolean }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let revoke: string | undefined;
    getImageURL(item.imageId).then((u) => { revoke = u; setUrl(u); });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item.imageId]);

  const shuffle = SHUFFLE_POSITIONS[index % SHUFFLE_POSITIONS.length];
  const reveal = REVEAL_POSITIONS[index % REVEAL_POSITIONS.length];
  const style = {
    '--float-x': `${shuffle.driftX}px`,
    '--float-y': `${shuffle.driftY}px`,
    '--float-rotate': `${shuffle.driftRotate}deg`,
    position: 'absolute',
    left: revealed ? reveal.x : shuffle.x,
    top: revealed ? reveal.y : shuffle.y,
    width: revealed ? reveal.width : '34%',
    transform: `rotate(${revealed ? reveal.rotate : shuffle.rotate}deg) scale(${revealed ? reveal.scale : shuffle.scale})`,
    animationDelay: `${index * 140}ms`,
    zIndex: revealed ? 20 - index : 10 + index,
  } as CSSProperties;

  return (
    <div
      className={`closet-card transition-[left,top,width,transform,opacity] duration-700 ease-out ${
        revealed ? 'is-floating opacity-100' : 'is-shuffling opacity-95'
      }`}
      style={style}
    >
      {url ? (
        <img src={url} alt={item.name ?? item.category} className="w-full"
          style={{ filter: 'drop-shadow(0 10px 14px rgba(60,50,40,0.22))' }} />
      ) : (
        <div className="aspect-[0.9] w-full animate-pulse rounded-2xl bg-line/50" />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════
// 完成模式
// ════════════════════════════════════════════════════
function DoneMode({
  today, items, todayLog, luckyWuxing,
}: {
  today: Date;
  items: Item[];
  todayLog?: WearLog;
  luckyWuxing: WuXing[];
}) {
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // 當日穿搭單品的五行分布；無資料給 demo 分布以利看版型。
  const dist = useMemo<Record<WuXing, number>>(() => {
    const base: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    const map = new Map(items.map((i) => [i.id, i] as const));
    for (const id of todayLog?.itemIds ?? []) {
      const it = map.get(id);
      if (it) base[it.wuxing]++;
    }
    const total = WUXING_ORDER.reduce((s, w) => s + base[w], 0);
    return total > 0 ? base : { 木: 1, 火: 3, 土: 2, 金: 1, 水: 1 };
  }, [items, todayLog]);

  const max = Math.max(...WUXING_ORDER.map((w) => dist[w]), 1);
  const tone = WUXING_ORDER.reduce((a, b) => (dist[b] > dist[a] ? b : a), '土' as WuXing);

  return (
    <>
      <section className="editorial-hero" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <p className="lucky-label">Today</p>
        <h1 className="editorial-title" style={{ fontSize: 30 }}>{dateLabel}</h1>
      </section>

      {/* 今日穿搭拼貼照（整身照 + 去背單品疊放）＋已記錄標籤 */}
      <div className="done-photo">
        <div className="done-fullbody">
          <span className="done-badge">✓ 已記錄</span>
        </div>
        <div className="done-items">
          <div className="done-item" style={{ background: 'linear-gradient(135deg,#2c2c2e,#4a4a4d)' }} />
          <div className="done-item" style={{ background: 'linear-gradient(135deg,#cbb18a,#a98a5f)' }} />
          <div className="done-item" style={{ background: 'linear-gradient(135deg,#8a98ad,#5d6b80)' }} />
          <div className="done-item" style={{ background: 'linear-gradient(135deg,#c9a06a,#9c7440)' }} />
        </div>
      </div>

      {/* 今日五行解析卡 */}
      <div className="analysis-card">
        <h3>今日五行解析</h3>
        <div className="wuxing-bars">
          {WUXING_ORDER.map((w) => (
            <div key={w} className="wuxing-bar">
              <span
                className="bar-fill"
                style={{ height: `${(dist[w] / max) * 100}%`, background: WUXING_HEX[w] }}
              />
              <span className={`bar-label ${WUXING_TONE_CLASS[w]}`}>{w}</span>
            </div>
          ))}
        </div>
        <p className="lucky-reason">
          今日穿搭以
          <span className={WUXING_TONE_CLASS[tone]}> {tone} </span>
          為基調。
          {`與今日幸運五行（${luckyWuxing.join('、')}）相互呼應，也呼應今日占星氣質。`}
        </p>
        <p className="disclaimer">＊命理為簡化模型，僅供參考</p>
      </div>

      {/* 動作列：輸出 IG / 重拍 */}
      <div className="action-row">
        <button type="button" className="btn-ghost">重拍 / 改穿搭</button>
        <button type="button" className="btn-solid">輸出今天穿搭到 IG</button>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════
// 月曆 + 月度統計 + 日期 Sheet
// ════════════════════════════════════════════════════
function CalendarSection({ items }: { items: Item[] }) {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [uploadingDate, setUploadingDate] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const monthKey = ymKey(view.year, view.month);
  const logs = useLiveQuery(() => listWearLogsInMonth(monthKey), [monthKey], []);

  const logByDay = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const l of logs ?? []) map.set(l.date, l.imageId);
    return map;
  }, [logs]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const firstDow = (new Date(view.year, view.month, 1).getDay() + 6) % 7; // Mon=0
  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth();
  const monthLabel = new Date(view.year, view.month, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shift = (delta: number) => setView((v) => {
    const m = v.month + delta;
    return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openWearPhotoPicker = (date: string) => {
    setPendingDate(date);
    pickerRef.current?.click();
  };

  const onWearPhotoPicked = async (file?: File) => {
    if (!file || !pendingDate) return;
    setUploadingDate(pendingDate);
    try {
      const existing = await getWearLogByDate(pendingDate);
      const imageId = await storeImage(file);
      await saveWearLog({
        id: uuid(),
        date: pendingDate,
        imageId,
        itemIds: existing?.itemIds ?? [],
        wuxingTone: existing?.wuxingTone,
        note: existing?.note,
        createdAt: Date.now(),
      });
    } finally {
      setUploadingDate(null);
      setPendingDate(null);
      if (pickerRef.current) pickerRef.current.value = '';
    }
  };

  // 月度統計（無資料時給 demo 值，方便先看版型）。
  const stats = useMemo(() => {
    const count = logs?.length ?? 0;
    if (!count) return { count: 12, top: '羊毛針織衫', spend: '$3,280', demo: true };
    const freq = new Map<string, number>();
    for (const l of logs ?? []) for (const id of l.itemIds) freq.set(id, (freq.get(id) ?? 0) + 1);
    let topId = ''; let topN = 0;
    for (const [id, n] of freq) if (n > topN) { topN = n; topId = id; }
    const topItem = items.find((i) => i.id === topId);
    const spend = items
      .filter((i) => new Date(i.createdAt).getMonth() === view.month)
      .reduce((s, i) => s + (i.price ?? 0), 0);
    return { count, top: topItem?.name ?? '—', spend: `$${spend.toLocaleString()}`, demo: false };
  }, [logs, items, view.month]);

  return (
    <section id="wear-log-calendar" className="planner-card">
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onWearPhotoPicked(e.target.files?.[0])}
      />

      <div className="planner-surface" style={{ paddingBottom: 24 }}>
        <div className="calendar">
          <div className="mb-3 flex items-center justify-between px-1">
            <button onClick={() => shift(-1)} aria-label="上個月" className="ghost-action text-base">‹</button>
            <span className="font-serif text-base text-ink">{monthLabel}</span>
            <button onClick={() => shift(1)} aria-label="下個月" className="ghost-action text-base">›</button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d} className={d === 'Sun' ? 'is-sunday' : ''}>{d}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`blank-${i}`} className="calendar-cell is-muted" style={{ background: 'transparent' }} />
            ))}
            {days.map((day) => {
              const key = dateKey(view.year, view.month, day);
              const imageId = logByDay.get(key);
              const isToday = isCurrentMonth && day === now.getDate();
              return (
                <CalendarCell
                  key={key} day={day} imageId={imageId} isToday={isToday}
                  isUploading={uploadingDate === key}
                  onClick={() => (imageId ? setPreviewDate(key) : openWearPhotoPicker(key))}
                />
              );
            })}
          </div>
        </div>

        {/* 月度統計三欄 */}
        <div className="stats-row">
          <div className="stat-cell">
            <div className="stat-label">本月穿搭</div>
            <div className="stat-value">{stats.count}</div>
            <div className="stat-sub">天</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">最常穿</div>
            <div className="stat-value" style={{ fontSize: 15, lineHeight: 1.3 }}>{stats.top}</div>
            <div className="stat-sub">單品</div>
          </div>
          <div className="stat-cell">
            <div className="stat-label">本月支出</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{stats.spend}</div>
            <div className="stat-sub">{stats.demo ? '示意' : '新增單品'}</div>
          </div>
        </div>
      </div>
      {previewDate && (
        <CalendarPreviewSheet
          date={previewDate}
          items={items}
          onClose={() => setPreviewDate(null)}
        />
      )}
    </section>
  );
}

function CalendarCell({
  day, imageId, isToday, isUploading, onClick,
}: { day: number; imageId?: string; isToday: boolean; isUploading?: boolean; onClick: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!imageId) return;
    let revoke: string | undefined;
    getImageURL(imageId).then((u) => { revoke = u; setUrl(u); });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [imageId]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`calendar-cell${imageId ? ' is-featured' : ''}`}
      style={{
        border: 0,
        cursor: isUploading ? 'progress' : 'pointer',
        opacity: isUploading ? 0.65 : 1,
        ...(isToday ? { boxShadow: 'inset 0 0 0 2px #d95a3e' } : {}),
      }}
      aria-label={`${day}號${imageId ? '，查看穿搭預覽' : '，上傳穿搭照片'}`}
      disabled={isUploading}
    >
      <span style={isToday ? { color: '#d95a3e', fontWeight: 600 } : undefined}>{day}</span>
      {url && (
        <div className="calendar-photo" style={{ background: `center/cover no-repeat url(${url})` }} />
      )}
      {isUploading && <span className="calendar-uploading">上傳中</span>}
    </button>
  );
}

function CalendarPreviewSheet({
  date,
  items,
  onClose,
}: {
  date: string;
  items: Item[];
  onClose: () => void;
}) {
  const log = useLiveQuery(() => getWearLogByDate(date), [date]);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [sharing, setSharing] = useState(false);
  const label = new Date(date).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' });
  const logItems = (log?.itemIds ?? []).map((id) => items.find((i) => i.id === id)).filter(Boolean) as Item[];

  useEffect(() => {
    let revoke: string | undefined;
    if (!log?.imageId) {
      setPreviewUrl(undefined);
      return;
    }
    getImageURL(log.imageId).then((u) => {
      revoke = u;
      setPreviewUrl(u);
    });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [log?.imageId]);

  const shareToInstagram = async () => {
    if (!log?.imageId) return;
    setSharing(true);
    try {
      const blob = await getImageBlob(log.imageId);
      if (!blob) return;
      const file = new File([blob], `ootd-${date}.webp`, { type: blob.type || 'image/webp' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({
          files: [file],
          title: `OOTD ${label}`,
          text: '分享到 IG',
        });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ootd-${date}.webp`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSharing(false);
    }
  };

  if (!log) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={`${label} 穿搭預覽`}>
        <div className="sheet-handle" />
        <div className="flex items-baseline justify-between">
          <h3 className="font-serif text-xl text-ink">{label}</h3>
          <button type="button" className="ghost-action text-sm text-muted" onClick={onClose}>關閉</button>
        </div>

        <div className="wearlog-preview">
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} 穿搭照片`} className="wearlog-preview-image" />
          ) : (
            <div className="wearlog-preview-empty">這天還沒有穿搭照片</div>
          )}
        </div>

        {logItems.length > 0 && (
          <div className="sheet-items">
            {logItems.map((it) => <SheetItem key={it.id} item={it} />)}
          </div>
        )}

        <div className="action-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn-ghost" onClick={onClose}>返回月曆</button>
          <button type="button" className="btn-solid" onClick={shareToInstagram} disabled={sharing}>
            {sharing ? '準備分享中…' : '分享到 IG'}
          </button>
        </div>
      </div>
    </>
  );
}

function SheetItem({ item }: { item: Item }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let revoke: string | undefined;
    getImageURL(item.imageId).then((u) => { revoke = u; setUrl(u); });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item.imageId]);

  return (
    <div className="sheet-item" style={url ? { background: `center/cover no-repeat url(${url})` } : undefined} />
  );
}
