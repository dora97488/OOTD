import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingIntro from './OnboardingIntro';
import { type WuXing } from '../db/db';
import { saveProfile } from '../data';
import { computeBazi } from '../engines/wuxing';
import { type AstroResult } from '../engines/astro';
import { CITIES } from '../constants/cities';
import { WUXING_HEX } from '../constants/colors';
import { hourToShichen } from '../engines/shichen';

export default function Onboarding() {
  const nav = useNavigate();
  const [intro, setIntro] = useState(true); // 先播開場動畫，播完才進表單
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [time, setTime] = useState<string>(''); // "HH:MM"，空＝不確定
  const [placeName, setPlaceName] = useState<string>('');
  const [result, setResult] = useState<ReturnType<typeof computeBazi> | null>(null);
  const [astro, setAstro] = useState<AstroResult | null>(null);

  const calc = async () => {
    if (!birthDate) return;
    const h = time ? Number(time.split(':')[0]) : undefined;
    const m = time ? Number(time.split(':')[1]) : 0;
    setResult(computeBazi(birthDate, h));
    // 星盤：時間＋出生地都齊才算（需經緯度才有上升星座）。astro 引擎較重 → 延遲載入。
    const place = CITIES.find((c) => c.name === placeName);
    if (h != null && place) {
      try {
        const { computeNatalChart } = await import('../engines/astro');
        setAstro(
          computeNatalChart({
            date: birthDate,
            hour: h,
            minute: m,
            lat: place.lat,
            lng: place.lng,
          })
        );
      } catch (e) {
        console.warn('[astro] 星盤計算失敗：', e);
        setAstro(null);
      }
    } else {
      setAstro(null);
    }
  };

  const finish = async () => {
    if (!result || !birthDate) return;
    const place = CITIES.find((c) => c.name === placeName);
    const h = time ? Number(time.split(':')[0]) : undefined;
    const m = time ? Number(time.split(':')[1]) : 0;
    await saveProfile({
      nickname: nickname.trim() || undefined,
      mode: 'hybrid', // 預設「混合」(分層)，對齊產品設計
      birthDate,
      birthHour: h,
      birthMinute: time ? m : undefined,
      birthPlace: place,
      astro: astro ?? undefined,
      dayMasterWuxing: result.dayMasterWuxing,
      wuxingCount: result.wuxingCount,
      favorable: result.favorable,
      unfavorable: result.unfavorable,
      notifyMorning: true, // 預設開啟（先做皮；實際排程待 Phase 1）
      notifyEvening: true,
      createdAt: Date.now(),
    });
    // TODO(onboarding 負責人)：第④步「推播授權」可呼叫 platform/capabilities 的 requestNotificationPermission()
    nav('/', { replace: true });
  };

  if (intro) {
    return <OnboardingIntro onDone={() => setIntro(false)} />;
  }

  return (
    <div className="px-6 py-10">
      <p className="font-serif text-4xl tracking-widest text-seal">OOTD</p>
      <p className="mt-2 text-sm text-muted">Never stress over what to wear.</p>

      <h1 className="mt-10 font-serif text-2xl text-ink">先算你的五行</h1>
      <p className="mt-1 text-sm text-muted">輸入生辰，我們會算出你的喜用五行，用來推薦開運穿搭。</p>

      <label className="mt-6 block text-sm text-ink">暱稱（可略）</label>
      <input
        type="text"
        value={nickname}
        maxLength={20}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="想怎麼稱呼你？"
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-ink"
      />

      <label className="mt-4 block text-sm text-ink">出生日期</label>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-ink"
      />

      <label className="mt-4 block text-sm text-ink">出生時間（可略，留空＝不確定）</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-card px-4 py-3 text-ink"
        />
        {time && (
          <span className="shrink-0 rounded-xl border border-line bg-card px-3 py-3 text-sm text-muted">
            {hourToShichen(Number(time.split(':')[0]))}
          </span>
        )}
      </div>

      <label className="mt-4 block text-sm text-ink">出生地點（可略，用來解鎖星盤）</label>
      <select
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-ink"
      >
        <option value="">不確定 / 不提供</option>
        {CITIES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">填了「時辰＋出生地」就會順便算出你的星盤（太陽／月亮／上升）。</p>

      {!result ? (
        <button
          onClick={calc}
          disabled={!birthDate}
          className="mt-8 w-full rounded-xl bg-seal py-3.5 font-medium text-white disabled:opacity-40"
        >
          揭曉我的五行
        </button>
      ) : (
        <div className="mt-8">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="text-sm text-muted">命主</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: WUXING_HEX[result.dayMasterWuxing] }} />
              <span className="font-serif text-2xl text-ink">{result.dayMasterWuxing}</span>
            </div>
            <Row label="喜用（多穿）" items={result.favorable} />
            <Row label="忌（少穿）" items={result.unfavorable} />
            <p className="mt-3 text-xs text-muted">＊簡化命理模型，僅供參考。</p>
            {astro && (
              <p className="mt-2 text-xs text-muted">
                ★ 星盤已解鎖：太陽 {astro.sunSign}・月亮 {astro.moonSign}・上升 {astro.risingSign}（到「我的」看詳情）
              </p>
            )}
          </div>
          <button onClick={finish} className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white">
            開始使用
          </button>
          <button onClick={() => setResult(null)} className="mt-2 w-full py-2 text-sm text-muted">
            重新輸入
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, items }: { label: string; items: WuXing[] }) {
  return (
    <div className="mt-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 flex gap-2">
        {items.map((w) => (
          <span key={w} className="chip" style={{ color: WUXING_HEX[w], borderColor: WUXING_HEX[w] }}>
            <span className="wuxing-dot" style={{ background: WUXING_HEX[w] }} />
            {w}
          </span>
        ))}
      </div>
    </div>
  );
}
