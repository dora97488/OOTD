import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getProfile,
  exportAll,
  importAll,
  updateProfile,
  saveProfile,
  listItems,
  storeImage,
  getImageURL,
  deleteImage,
} from '../data';
import { CATEGORIES } from '../db/db';
import type { Profile, Item, WuXing } from '../db/db';
import { requestNotificationPermission } from '../platform/capabilities';
import { computeBazi } from '../engines/wuxing';
import type { AstroResult } from '../engines/astro';
import { closetStats } from '../engines/stats';
import { composeProfileCard } from '../engines/igExport';
import { CITIES } from '../constants/cities';
import { WUXING_HEX } from '../constants/colors';
import PageHeader from '../components/PageHeader';
import BottomSheet from '../components/BottomSheet';
import Toggle from '../components/Toggle';
import { hourToShichen } from '../engines/shichen';

const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];

const SIGN_ZH: Record<string, string> = {
  Aries: '牡羊座', Taurus: '金牛座', Gemini: '雙子座', Cancer: '巨蟹座',
  Leo: '獅子座', Virgo: '處女座', Libra: '天秤座', Scorpio: '天蠍座',
  Sagittarius: '射手座', Capricorn: '摩羯座', Aquarius: '水瓶座', Pisces: '雙魚座',
};

const MODE_INFO: Record<Profile['mode'], { label: string; desc: string }> = {
  bazi: { label: '五行', desc: '八字喜用神 → 幸運色' },
  astro: { label: '占星', desc: '西洋本命盤元素' },
  hybrid: { label: '混合', desc: '分層：五行 ＋ 占星' },
};

const slashDate = (d?: string) => (d ? d.split('-').join('/') : '—');

export default function Profile() {
  const profile = useLiveQuery(() => getProfile());
  const items = useLiveQuery(() => listItems(), [], [] as Item[]);
  const [birthOpen, setBirthOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);

  const metaLine = profile
    ? [
        profile.birthDate?.slice(0, 4),
        profile.favorable?.length ? `喜用神「${profile.favorable.join('、')}」` : null,
        profile.astro ? SIGN_ZH[profile.astro.sunSign] ?? profile.astro.sunSign : null,
      ]
        .filter(Boolean)
        .join('  ·  ')
    : '';

  return (
    <div>
      <PageHeader en="Profile" title="我的" sub="命盤 · 五行喜忌 · 穿著統計" />
      <div className="px-5">
        {/* 基本資料：頭像 / 暱稱 / 出生年·喜用神·星座 / 五行分布條 */}
        {profile && (
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center gap-4">
              <AvatarField profile={profile} />
              <div className="min-w-0 flex-1">
                <NicknameField profile={profile} />
                <div className="mt-1 truncate text-sm text-muted">{metaLine}</div>
              </div>
            </div>
            {profile.wuxingCount && (
              <WuxingBars
                count={profile.wuxingCount}
                favorable={profile.favorable}
                unfavorable={profile.unfavorable}
              />
            )}
          </div>
        )}

        {/* 命理資料：生辰／命盤（可編輯）＋ 星盤 ＋ 占卜原理偏好 */}
        {profile && (
          <div className="mt-3 rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="text-sm text-muted">命理資料</div>

            <InfoRow
              label="生辰／命盤"
              value={`${slashDate(profile.birthDate)} · ${hourToShichen(profile.birthHour)}${
                profile.birthPlace ? ` · ${profile.birthPlace.name}` : ''
              }`}
              action="編輯"
              onAction={() => setBirthOpen(true)}
            />

            {profile.astro && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <AstroCell label="太陽" sign={profile.astro.sunSign} />
                <AstroCell label="月亮" sign={profile.astro.moonSign} />
                <AstroCell label="上升" sign={profile.astro.risingSign} />
              </div>
            )}

            <div className="my-3 border-t border-line" />

            <InfoRow
              label="占卜原理偏好"
              value={`${MODE_INFO[profile.mode].label}（${MODE_INFO[profile.mode].desc}）`}
              action="調整"
              onAction={() => setModeOpen(true)}
            />
            <p className="mt-2 text-xs text-faint">命理為簡化模型，僅供參考。</p>
          </div>
        )}

        {/* 通知偏好（先做皮：存偏好＋要權限；實際排程待 Phase 1） */}
        {profile && <NotifySection profile={profile} />}

        {/* 穿著統計 */}
        <StatsCard items={items} />

        {/* IG 匯出：分享我的命盤卡 */}
        {profile && <ShareProfileButton profile={profile} />}

        {/* 資料安全網（基礎建設提供）：匯出 / 匯入 */}
        <BackupSection />
      </div>

      {profile && (
        <>
          <BirthEditSheet profile={profile} open={birthOpen} onClose={() => setBirthOpen(false)} />
          <DivinationModeSheet profile={profile} open={modeOpen} onClose={() => setModeOpen(false)} />
        </>
      )}
    </div>
  );
}

// ---- 基本資料子元件 ------------------------------------------------------

function AvatarField({ profile }: { profile: Profile }) {
  const [url, setUrl] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current: string | undefined;
    getImageURL(profile.avatarImageId).then((u) => {
      current = u;
      setUrl(u);
    });
    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [profile.avatarImageId]);

  const onPick = async (file: File) => {
    setBusy(true);
    try {
      const newId = await storeImage(file);
      const oldId = profile.avatarImageId;
      await updateProfile({ avatarImageId: newId });
      if (oldId && oldId !== newId) await deleteImage(oldId);
    } finally {
      setBusy(false);
    }
  };

  const fallbackBg = profile.dayMasterWuxing ? WUXING_HEX[profile.dayMasterWuxing] : 'var(--terracotta)';
  const firstChar = (profile.nickname ?? '').trim().slice(0, 1) || '我';

  return (
    <label className={`relative block h-16 w-16 shrink-0 cursor-pointer ${busy ? 'opacity-50' : ''}`}>
      {url ? (
        <img src={url} alt="頭像" className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: fallbackBg }}
        >
          <span className="font-serif text-2xl text-white">{firstChar}</span>
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-card text-[11px] text-terracotta">
        ✎
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}

function NicknameField({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const start = () => {
    setVal(profile.nickname ?? '');
    setEditing(true);
  };
  const save = async () => {
    setEditing(false);
    const v = val.trim();
    if (v !== (profile.nickname ?? '')) await updateProfile({ nickname: v || undefined });
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        maxLength={20}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        placeholder="輸入暱稱"
        className="w-full rounded-lg border border-line bg-paper px-2 py-1 font-serif text-2xl text-ink"
      />
    );
  }
  return (
    <button onClick={start} className="block text-left font-serif text-2xl text-ink">
      {profile.nickname || <span className="text-faint">設定暱稱</span>}
    </button>
  );
}

// 五行分布條（圖表＋解釋）。命理為簡化模型，依規則 7 標「僅供參考」。
function WuxingBars({
  count,
  favorable,
  unfavorable,
}: {
  count: Record<WuXing, number>;
  favorable: WuXing[];
  unfavorable: WuXing[];
}) {
  const max = Math.max(1, ...WUXING_ORDER.map((w) => count[w] ?? 0));
  return (
    <div className="mt-4">
      <div className="text-sm text-muted">五行分布</div>
      <div className="mt-2 space-y-2">
        {WUXING_ORDER.map((w) => {
          const n = count[w] ?? 0;
          const fav = favorable.includes(w);
          const unfav = unfavorable.includes(w);
          return (
            <div key={w} className="flex items-center gap-2">
              <span className="w-4 font-serif text-base leading-none" style={{ color: WUXING_HEX[w] }}>
                {w}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(n / max) * 100}%`, background: WUXING_HEX[w] }}
                />
              </div>
              <span className="w-4 text-right text-xs tabular-nums text-muted">{n}</span>
              <span className="w-7 text-right text-[11px] leading-none">
                {fav && <span className="text-terracotta">喜用</span>}
                {unfav && <span className="text-faint">忌</span>}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-faint">
        分布最少者多列為「喜用」，建議多穿其對應色；命理為簡化模型，僅供參考。
      </p>
    </div>
  );
}

function AstroCell({ label, sign }: { label: string; sign: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-serif text-base text-ink">{SIGN_ZH[sign] ?? sign ?? '—'}</div>
    </div>
  );
}

// 命理資料的列：左標題＋值，右動作鈕（編輯／調整）。
function InfoRow({
  label,
  value,
  action,
  onAction,
}: {
  label: string;
  value: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        <div className="mt-0.5 truncate text-sm text-muted">{value}</div>
      </div>
      <button
        onClick={onAction}
        className="shrink-0 rounded-lg border border-line bg-paper px-3 py-1.5 text-sm text-ink"
      >
        {action} ›
      </button>
    </div>
  );
}

// ---- 通知偏好 ------------------------------------------------------------

function NotifySection({ profile }: { profile: Profile }) {
  const set = async (patch: Partial<Profile>, turningOn: boolean) => {
    if (turningOn) await requestNotificationPermission();
    await updateProfile(patch);
  };
  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">通知偏好</div>
        <span className="rounded-full bg-bg-muted px-2 py-0.5 text-[11px] text-muted">先做皮</span>
      </div>
      <NotifyRow
        title="每日開運推播"
        sub="每天 07:30"
        checked={profile.notifyMorning ?? false}
        onChange={(v) => set({ notifyMorning: v }, v)}
      />
      <NotifyRow
        title="記得記錄今日穿搭"
        sub="每晚 21:00 提醒拍照"
        checked={profile.notifyEvening ?? false}
        onChange={(v) => set({ notifyEvening: v }, v)}
      />
      <p className="mt-3 text-xs text-faint">
        實際每日推播需安裝為 App 後啟用（Phase 1）；此處先記錄你的偏好。
      </p>
    </div>
  );
}

function NotifyRow({
  title,
  sub,
  checked,
  onChange,
}: {
  title: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-ink">{title}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} aria-label={title} />
    </div>
  );
}

// ---- 穿著統計 ------------------------------------------------------------

function StatsCard({ items }: { items: Item[] }) {
  const stats = useMemo(() => closetStats(items), [items]);
  const catMax = Math.max(1, ...CATEGORIES.map((c) => stats.byCategory[c] ?? 0));

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-5 shadow-card">
      <div className="text-sm text-muted">穿著統計</div>

      {stats.totalItems === 0 ? (
        <p className="mt-2 text-sm text-muted">衣櫥還是空的。到「衣櫥」拍照新增衣物後，這裡會出現分類分布、CPW 與最常穿單品。</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="總件數" value={String(stats.totalItems)} />
            <Stat label="總穿著次數" value={String(stats.totalWears)} />
            <Stat label="平均 CPW" value={stats.avgCpw != null ? `$${Math.round(stats.avgCpw)}` : '—'} />
          </div>

          <div className="mt-4 text-sm text-muted">分類分布</div>
          <div className="mt-2 space-y-1.5">
            {CATEGORIES.filter((c) => (stats.byCategory[c] ?? 0) > 0).map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="w-10 text-xs text-ink">{c}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-muted">
                  <div
                    className="h-full rounded-full bg-terracotta"
                    style={{ width: `${((stats.byCategory[c] ?? 0) / catMax) * 100}%` }}
                  />
                </div>
                <span className="w-5 text-right text-xs tabular-nums text-muted">{stats.byCategory[c]}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-muted">衣櫥五行</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {WUXING_ORDER.map((w) => (
              <span
                key={w}
                className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-xs"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: WUXING_HEX[w] }} />
                <span className="text-ink">{w}</span>
                <span className="tabular-nums text-muted">{stats.byWuxing[w] ?? 0}</span>
              </span>
            ))}
          </div>

          {stats.mostWorn && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-paper p-3">
              <Thumb imageId={stats.mostWorn.imageId} className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0">
                <div className="text-xs text-muted">最常穿</div>
                <div className="truncate text-sm text-ink">
                  {stats.mostWorn.name || stats.mostWorn.colorName + stats.mostWorn.category}
                </div>
              </div>
              <div className="ml-auto text-sm tabular-nums text-muted">×{stats.mostWorn.wearCount}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper py-2">
      <div className="font-serif text-xl text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function Thumb({ imageId, className }: { imageId?: string; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let current: string | undefined;
    getImageURL(imageId).then((u) => {
      current = u;
      setUrl(u);
    });
    return () => {
      if (current) URL.revokeObjectURL(current);
    };
  }, [imageId]);
  return url ? (
    <img src={url} alt="" className={className} />
  ) : (
    <div className={`${className ?? ''} bg-bg-muted`} />
  );
}

// ---- IG 匯出：分享我的命盤 ------------------------------------------------

function ShareProfileButton({ profile }: { profile: Profile }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  const onShare = async () => {
    setBusy(true);
    setMsg(undefined);
    let avatarUrl: string | undefined;
    try {
      avatarUrl = await getImageURL(profile.avatarImageId);
      const blob = await composeProfileCard({
        nickname: profile.nickname || '我',
        avatarUrl,
        dayMasterWuxing: profile.dayMasterWuxing,
        favorable: profile.favorable ?? [],
        wuxingCount: profile.wuxingCount,
        sunSignZh: profile.astro ? SIGN_ZH[profile.astro.sunSign] ?? profile.astro.sunSign : undefined,
        dateLabel: new Date().toISOString().slice(0, 10).split('-').join('.'),
      });
      if (!blob) {
        setMsg('產生失敗，請再試一次');
        return;
      }
      const file = new File([blob], 'ootd-命盤.png', { type: 'image/png' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'OOTD · 我的命盤' });
        setMsg('已開啟分享');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ootd-命盤.png';
        a.click();
        URL.revokeObjectURL(url);
        setMsg('已下載命盤卡');
      }
    } catch (e) {
      // 使用者取消分享會 throw AbortError，視為正常。
      if ((e as Error).name !== 'AbortError') setMsg('產生失敗：' + (e as Error).message);
    } finally {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="text-sm font-medium text-ink">分享我的命盤</div>
      <p className="mt-1 text-xs text-muted">產生一張命盤卡（頭像／喜用神／五行分布／星座），可存圖或分享到 IG。</p>
      <button
        onClick={onShare}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-terracotta py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? '產生中…' : '產生命盤卡'}
      </button>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}

// ---- 生辰／命盤 編輯 sheet（重算八字＋星盤） ------------------------------

function BirthEditSheet({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const [birthDate, setBirthDate] = useState('');
  const [time, setTime] = useState(''); // "HH:MM"，空＝不確定
  const [placeName, setPlaceName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBirthDate(profile.birthDate ?? '');
    setTime(
      profile.birthHour != null
        ? `${String(profile.birthHour).padStart(2, '0')}:${String(profile.birthMinute ?? 0).padStart(2, '0')}`
        : ''
    );
    setPlaceName(profile.birthPlace?.name ?? '');
  }, [open, profile]);

  const save = async () => {
    if (!birthDate) return;
    setBusy(true);
    try {
      const h = time ? Number(time.split(':')[0]) : undefined;
      const m = time ? Number(time.split(':')[1]) : 0;
      const bazi = computeBazi(birthDate, h);
      const place = CITIES.find((c) => c.name === placeName);
      let astro: AstroResult | undefined;
      if (h != null && place) {
        try {
          const { computeNatalChart } = await import('../engines/astro');
          astro = computeNatalChart({
            date: birthDate,
            hour: h,
            minute: m,
            lat: place.lat,
            lng: place.lng,
          });
        } catch (e) {
          console.warn('[astro] 星盤計算失敗：', e);
        }
      }
      // 用 saveProfile 全量覆寫（保留 nickname/avatar/mode/通知等其他欄位，
      // 並確保移除時間/地點時 astro 會被清掉）。
      await saveProfile({
        ...profile,
        birthDate,
        birthHour: h,
        birthMinute: time ? m : undefined,
        birthPlace: place,
        astro,
        dayMasterWuxing: bazi.dayMasterWuxing,
        wuxingCount: bazi.wuxingCount,
        favorable: bazi.favorable,
        unfavorable: bazi.unfavorable,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="編輯生辰／命盤">
      <label className="block text-sm text-ink">出生日期</label>
      <input
        type="date"
        value={birthDate}
        onChange={(e) => setBirthDate(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink"
      />

      <label className="mt-4 block text-sm text-ink">出生時間（可略，留空＝不確定）</label>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-paper px-4 py-3 text-ink"
        />
        {time && (
          <span className="shrink-0 rounded-xl border border-line bg-paper px-3 py-3 text-sm text-muted">
            {hourToShichen(Number(time.split(':')[0]))}
          </span>
        )}
      </div>

      <label className="mt-4 block text-sm text-ink">出生地點（可略，用來解鎖星盤）</label>
      <select
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink"
      >
        <option value="">不確定 / 不提供</option>
        {CITIES.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-muted">填了「時辰＋出生地」就會順便重算星盤（太陽／月亮／上升）。</p>

      <button
        onClick={save}
        disabled={!birthDate || busy}
        className="mt-6 w-full rounded-xl bg-terracotta py-3 font-medium text-white disabled:opacity-40"
      >
        {busy ? '重算中…' : '儲存並重算'}
      </button>
    </BottomSheet>
  );
}

// ---- 占卜原理偏好 sheet（五行 / 占星 / 混合） ------------------------------

function DivinationModeSheet({
  profile,
  open,
  onClose,
}: {
  profile: Profile;
  open: boolean;
  onClose: () => void;
}) {
  const hasAstro = !!profile.astro;
  const choose = async (m: Profile['mode']) => {
    if (m !== profile.mode) await updateProfile({ mode: m });
    onClose();
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="占卜原理偏好">
      <div className="space-y-2">
        <ModeChoice
          active={profile.mode === 'bazi'}
          label={MODE_INFO.bazi.label}
          desc={MODE_INFO.bazi.desc}
          onClick={() => choose('bazi')}
        />
        <ModeChoice
          active={profile.mode === 'astro'}
          disabled={!hasAstro}
          label={MODE_INFO.astro.label}
          desc={hasAstro ? MODE_INFO.astro.desc : '需先補出生時間／地點'}
          onClick={() => choose('astro')}
        />
        <ModeChoice
          active={profile.mode === 'hybrid'}
          label={MODE_INFO.hybrid.label}
          desc={MODE_INFO.hybrid.desc}
          onClick={() => choose('hybrid')}
        />
      </div>
      <p className="mt-3 text-xs text-faint">＊目前為偏好設定，「今天」的開運建議會依此陸續調整。</p>
    </BottomSheet>
  );
}

function ModeChoice({
  active,
  disabled,
  label,
  desc,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left disabled:opacity-40 ${
        active ? 'border-terracotta bg-paper' : 'border-line bg-paper'
      }`}
    >
      <div>
        <div className={`text-sm font-medium ${active ? 'text-terracotta' : 'text-ink'}`}>{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      {active && <span className="text-terracotta">✓</span>}
    </button>
  );
}

// ---- 備份 / 還原（基礎建設提供的本機資料安全網，串 data/backup.ts） --------

function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  const doExport = async () => {
    setBusy(true);
    setMsg(undefined);
    try {
      const blob = await exportAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ootd-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('已匯出備份檔');
    } catch (e) {
      setMsg('匯出失敗：' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    if (!window.confirm('匯入會覆寫目前所有資料，確定要還原嗎？')) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const r = await importAll(file);
      setMsg(`已還原 ${r.items} 件單品、${r.images} 張圖片`);
    } catch (e) {
      setMsg('匯入失敗：' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="text-sm font-medium text-ink">備份與還原</div>
      <p className="mt-1 text-xs text-muted">資料只存在本機，建議定期匯出。換機 / 清資料後可匯入還原。</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={doExport}
          disabled={busy}
          className="flex-1 rounded-xl bg-seal py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          匯出備份
        </button>
        <label className="flex-1 cursor-pointer rounded-xl border border-line bg-paper py-2.5 text-center text-sm text-ink">
          匯入還原
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
            }}
          />
        </label>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
