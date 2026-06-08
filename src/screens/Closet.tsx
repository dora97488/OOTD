// 衣櫥（Closet）—— 依 wardrobe-prototype 設計重製，接真實資料層（Dexie）。
// 相簿 / 搜尋 / 分類 chips / sticker 網格 / 單品 Sheet / 衣櫥分析 Sheet。
// 新增衣物：FAB 直接導到 /closet/add（AddItem，Abon 做的真實去背＋存檔流程）。
// 注：本畫面為配合作者原型採 inline style 與紫色點綴（與全站 Editorial token 略有出入，刻意保留原型風格）。
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  listItems, getImageURL, recordWear, deleteItem, seedClosetIfEmpty,
} from '../data';
import { CATEGORIES, type Item, type Category, type WuXing } from '../db/db';

// ── Design tokens（原型配色）─────────────────────────────────────────────
const C = {
  bg: '#F7F6F2', canvas: '#F1F0EC', surface: '#FFFFFF',
  ink: '#1E1E1C', inkSoft: '#6F6B64', inkMuted: '#B7B4AD',
  border: '#ECE9E3', borderMed: '#DEDAD2', terracotta: '#A94D28',
  purple: '#7e72a8', purpleBg: '#f4f2fa', purpleBorder: '#ddd6ef',
  green: '#3a8a5a', greenBg: '#eef7f1', greenBorder: '#cfe7d8',
};
const WX: Record<WuXing, { label: string; c: string; bg: string; br: string }> = {
  木: { label: '木', c: '#5a8a6b', bg: '#e8f5ec', br: '#b8dcc4' },
  火: { label: '火', c: '#c44a28', bg: '#fde8e2', br: '#f0c4b8' },
  土: { label: '土', c: '#b8932a', bg: '#fdf0d8', br: '#e8d0a0' },
  金: { label: '金', c: '#7a7a7a', bg: '#f0f0f0', br: '#d0d0d0' },
  水: { label: '水', c: '#4a6fa5', bg: '#e2eaf8', br: '#b8ccec' },
};
const CAT_COLORS: Record<Category, string> = {
  上衣: '#7e72a8', 下身: '#4a6fa5', 外套: '#5a8a6b', 洋裝: '#c4884a', 鞋: '#a94d28', 配件: '#b8932a',
};
const CATS: (Category | '全部')[] = ['全部', ...CATEGORIES];
const serif = { fontFamily: "'Cormorant Garamond','Georgia',serif" };
const BASE = import.meta.env.BASE_URL;

const cpw = (i: Item) => (i.price && i.wearCount > 0) ? Math.round(i.price / i.wearCount) : (i.price ?? 0);
const itemName = (i: Item) => i.name || i.colorName || i.category;

// 解析全部單品圖片的 objectURL（一次解析、卸載時釋放），避免每張卡各自 async。
function useItemImageUrls(items: Item[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = items.map((i) => i.imageId).join(',');
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    (async () => {
      const pairs = await Promise.all(
        items.map(async (it) => [it.imageId, await getImageURL(it.imageId)] as const)
      );
      if (!active) return;
      const m: Record<string, string> = {};
      for (const [id, u] of pairs) if (u) { m[id] = u; created.push(u); }
      setUrls(m);
    })();
    return () => { active = false; created.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

// ── Sticker：去背圖以「衣物本體」置中＋白色描邊（沿用原型 canvas 演算法）──────
function Sticker({ src, alt, pad = 22, stroke = 6 }: { src?: string; alt: string; pad?: number; stroke?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !src) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      // 邊界框只是用來「裁掉透明邊、置中」——探測解析度低一點就夠，誤差幾 px 肉眼無感。
      // 最終 drawImage 仍用原圖全解析度（sx/sy/sw/sh 已換算回原座標），不影響清晰度。
      // 用 128 而非 360：逐像素掃描＋getImageData 讀回量約降到 1/8，grid 多卡時主執行緒不再卡。
      const maxDim = 128;
      const k = Math.min(1, maxDim / Math.max(img.width, img.height));
      const iw = Math.max(1, Math.round(img.width * k));
      const ih = Math.max(1, Math.round(img.height * k));
      const probe = document.createElement('canvas');
      probe.width = iw; probe.height = ih;
      const pctx = probe.getContext('2d', { willReadFrequently: true })!;
      pctx.drawImage(img, 0, 0, iw, ih);
      let minX = iw, minY = ih, maxX = 0, maxY = 0, found = false;
      try {
        const px = pctx.getImageData(0, 0, iw, ih).data;
        for (let yy = 0; yy < ih; yy++) {
          for (let xx = 0; xx < iw; xx++) {
            if (px[(yy * iw + xx) * 4 + 3] > 12) {
              found = true;
              if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
              if (yy < minY) minY = yy; if (yy > maxY) maxY = yy;
            }
          }
        }
      } catch { /* 跨域取不到像素就畫整張 */ }
      const sx = found ? minX / k : 0;
      const sy = found ? minY / k : 0;
      const sw = found ? (maxX - minX + 1) / k : img.width;
      const sh = found ? (maxY - minY + 1) / k : img.height;

      const rect = canvas.getBoundingClientRect();
      const cw = rect.width || canvas.parentElement?.clientWidth || 240;
      const ch = rect.height || canvas.parentElement?.clientHeight || 240;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      const ctx = canvas.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const s = Math.min((cw - pad * 2) / sw, (ch - pad * 2) / sh);
      const w = sw * s, h = sh * s;
      const x = (cw - w) / 2, y = (ch - h) / 2;

      if (stroke > 0) {
        const off = document.createElement('canvas');
        off.width = Math.max(1, Math.round(w * dpr));
        off.height = Math.max(1, Math.round(h * dpr));
        const octx = off.getContext('2d')!;
        octx.scale(dpr, dpr);
        octx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        octx.globalCompositeOperation = 'source-in';
        octx.fillStyle = '#fff';
        octx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.shadowColor = 'rgba(30,30,28,.20)';
        ctx.shadowBlur = 9;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(off, x, y, w, h);
        ctx.restore();
        const steps = 32;
        for (let i = 0; i < steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          ctx.drawImage(off, x + Math.cos(a) * stroke, y + Math.sin(a) * stroke, w, h);
        }
      }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src, pad, stroke]);
  return <canvas ref={ref} aria-label={alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

// ── 分類 chip ────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 99, border: `1.5px solid ${active ? C.purple : C.purpleBorder}`, background: active ? C.purple : 'transparent', color: active ? '#fff' : C.inkSoft, fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 150ms' }}>{label}</button>
  );
}

// ── 單品卡 ───────────────────────────────────────────────────────────────
function Card({ it, url, onOpen }: { it: Item; url?: string; onOpen: () => void }) {
  const w = WX[it.wuxing];
  const asleep = it.wearCount < 4;
  return (
    <div onClick={onOpen} style={{ background: C.surface, borderRadius: 14, border: `1.5px solid ${asleep ? '#e8d4b8' : C.border}`, padding: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div style={{ aspectRatio: '1', borderRadius: 10, background: it.mainColorHex, position: 'relative', marginBottom: 7, overflow: 'hidden' }}>
        {url && <Sticker src={url} alt={itemName(it)} stroke={0} pad={12} />}
        {asleep && <div style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,248,234,.9)', borderRadius: 99, padding: '2px 6px', fontSize: 9, color: '#a07040', fontWeight: 700, backdropFilter: 'blur(4px)' }}>久未穿</div>}
        <div style={{ position: 'absolute', bottom: 5, left: 5, width: 20, height: 20, borderRadius: '50%', background: w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: w.c, fontWeight: 700, border: `1px solid ${w.br}` }}>{w.label}</div>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName(it)}</div>
      <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 2 }}>穿 {it.wearCount} 次</div>
    </div>
  );
}

// ── 相簿卡（2×2 拼貼或封面）──────────────────────────────────────────────
interface Album { id: string; name: string; cover?: string; match: (i: Item) => boolean; onTap?: () => void }
function AlbumCard({ album, items, urls }: { album: Album; items: Item[]; urls: Record<string, string> }) {
  const matched = items.filter(album.match);
  const over = matched.length > 4;
  const covers = over ? matched.slice(0, 3) : matched.slice(0, 4);
  return (
    <div onClick={album.onTap} style={{ flexShrink: 0, width: 124, cursor: 'pointer', userSelect: 'none' }}>
      {album.cover ? (
        <div style={{ aspectRatio: '1', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(30,30,28,.04)' }}>
          <img src={album.cover} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ aspectRatio: '1', borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, padding: 6, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 4, boxShadow: '0 1px 3px rgba(30,30,28,.04)' }}>
          {[0, 1, 2, 3].map((n) => {
            const showOver = over && n === 3;
            const it = showOver ? matched[3] : covers[n];
            return (
              <div key={n} style={{ borderRadius: 8, background: it ? it.mainColorHex : C.canvas, position: 'relative', overflow: 'hidden' }}>
                {it && urls[it.imageId] && <img src={urls[it.imageId]} alt={itemName(it)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                {showOver && <div style={{ position: 'absolute', inset: 0, background: 'rgba(30,30,28,.5)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+{matched.length - 3}</div>}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
      <div style={{ fontSize: 11, color: C.inkMuted, marginTop: 1 }}>{matched.length} 件物品</div>
    </div>
  );
}

// ── Bottom sheet 容器 ────────────────────────────────────────────────────
function Sheet({ visible, onClose, children, maxH = '82vh' }: { visible: boolean; onClose: () => void; children: React.ReactNode; maxH?: string }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: visible ? 'rgba(30,30,28,.44)' : 'transparent', transition: 'background 320ms' }} />
      <div className="mx-auto max-w-md" style={{ position: 'fixed', insetInline: 0, bottom: 0, zIndex: 61, transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 320ms cubic-bezier(.32,.72,0,1)' }}>
        <div style={{ background: C.surface, borderRadius: '26px 26px 0 0', maxHeight: maxH, overflowY: 'auto' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '14px auto 0' }} />
          {children}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, unit, sub, hl }: { label: string; value: React.ReactNode; unit?: string; sub?: string; hl?: boolean }) {
  return (
    <div style={{ background: hl ? '#fff8f5' : '#faf9f6', borderRadius: 16, padding: 14, border: `1px solid ${hl ? '#f0d8cc' : C.border}` }}>
      <div style={{ fontSize: 11, color: C.inkMuted, marginBottom: 4, fontStyle: 'italic' }}>{label}</div>
      <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: hl ? C.terracotta : C.ink, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 13, color: C.inkSoft }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: C.inkMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Donut({ data, total, size = 124, stroke = 18 }: { data: { c: string; n: number; color: string }[]; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const cir = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.canvas} strokeWidth={stroke} />
        {data.map((d, i) => {
          const frac = total ? d.n / total : 0;
          const dash = `${frac * cir} ${cir}`;
          const off = -acc * cir;
          acc += frac;
          return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={off} strokeLinecap="butt" style={{ transition: 'stroke-dasharray 500ms ease-out' }} />;
        })}
      </g>
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ ...serif, fontSize: 26, fontWeight: 600, fill: C.ink }}>{total}</text>
      <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 9, fill: C.inkMuted }}>件單品</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function Closet() {
  const items = useLiveQuery(() => listItems(), [], []);
  const urls = useItemImageUrls(items);
  const nav = useNavigate();

  const [filter, setFilter] = useState<Category | '全部'>('全部');
  const [search, setSearch] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [sheetIn, setSheetIn] = useState(false);
  const [anaOpen, setAnaOpen] = useState(false);
  const [anaIn, setAnaIn] = useState(false);

  // 進衣櫥時補齊原型 30 件示範資料（top-up：缺哪件補哪件，不覆蓋使用者資料）
  useEffect(() => {
    seedClosetIfEmpty().catch((e) => console.warn('[closet] seed 失敗：', e));
  }, []);

  // 依上傳順序（createdAt 升冪）顯示：先上傳的在前、新上傳的接在後面。
  // listItems() 預設新→舊，這裡明確改回上傳順序，不動其他畫面。
  const list = items
    .filter((i) =>
      (filter === '全部' || i.category === filter) &&
      (!search || itemName(i).includes(search) || (i.brand ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  const sleepy = items.filter((i) => i.wearCount < 4).length;

  const openItem = (i: Item) => { setItem(i); setTimeout(() => setSheetIn(true), 12); };
  const closeItem = () => { setSheetIn(false); setTimeout(() => setItem(null), 320); };
  const openAna = () => { setAnaOpen(true); setTimeout(() => setAnaIn(true), 12); };
  const closeAna = () => { setAnaIn(false); setTimeout(() => setAnaOpen(false), 320); };

  // 衣櫥分析聚合
  const totalWears = items.reduce((s, i) => s + i.wearCount, 0);
  const totalValue = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const avgCpw = items.length ? Math.round(items.reduce((s, i) => s + cpw(i), 0) / items.length) : 0;
  const utilization = items.length ? Math.round(items.filter((i) => i.wearCount >= 4).length / items.length * 100) : 0;
  const sleepyItems = items.filter((i) => i.wearCount < 4);
  const wxDist = (Object.keys(WX) as WuXing[]).map((k) => ({ k, n: items.filter((i) => i.wuxing === k).length }));
  const catDist = (CATEGORIES).map((c) => ({ c, n: items.filter((i) => i.category === c).length, color: CAT_COLORS[c] }))
    .filter((d) => d.n > 0);

  const ALBUMS: Album[] = [
    { id: 'all', name: '全部單品', match: () => true, onTap: () => setFilter('全部') },
    { id: 'summer', name: '夏季穿搭', cover: `${BASE}seed/summer.png`, match: (i) => i.season.includes('夏') },
    { id: 'dress', name: '洋裝系列', match: (i) => i.category === '洋裝', onTap: () => setFilter('洋裝') },
    { id: 'sleepy', name: '久未穿', match: (i) => i.wearCount < 4, onTap: openAna },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100%', paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '20px 22px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...serif, fontSize: 32, fontWeight: 600, color: C.ink, lineHeight: 1.05 }}>Wardrobe</div>
            <div style={{ fontSize: 13, color: C.purple, marginTop: 3, fontWeight: 500 }}>衣物管理 · {items.length} 件</div>
          </div>
          <button onClick={openAna} aria-label="衣櫥分析" style={{ position: 'relative', marginTop: 6, width: 40, height: 40, borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(30,30,28,.05)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round"><line x1="6" x2="6" y1="20" y2="14" /><line x1="12" x2="12" y1="20" y2="6" /><line x1="18" x2="18" y1="20" y2="10" /></svg>
            {sleepy > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 99, background: C.terracotta, color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.bg}` }}>{sleepy}</span>}
          </button>
        </div>
        <div style={{ height: 1, background: `linear-gradient(90deg,${C.purpleBorder},${C.border})`, margin: '12px 0' }} />
      </div>

      {/* Albums */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 22px 12px' }}>
        <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: C.ink }}>我的相簿</div>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollbarWidth: 'none', padding: '0 22px 2px' }}>
        {ALBUMS.map((a) => <AlbumCard key={a.id} album={a} items={items} urls={urls} />)}
      </div>
      <div style={{ height: 1, background: C.border, margin: '16px 22px' }} />

      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 22px 12px' }}>
        <div style={{ ...serif, fontSize: 19, fontWeight: 600, color: C.ink }}>所有單品</div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 22px 12px' }}>
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, boxShadow: '0 1px 3px rgba(30,30,28,.04)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="5" stroke={C.inkMuted} strokeWidth="1.5" /><line x1="10" y1="10" x2="13.5" y2="13.5" stroke={C.inkMuted} strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋名稱、品牌…" style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: C.ink, flex: 1 }} />
          {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.inkMuted, fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none', padding: '0 22px 14px', display: 'flex', gap: 8 }}>
        {CATS.map((c) => <Chip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />)}
      </div>

      {/* Count */}
      <div style={{ padding: '0 22px 10px', fontSize: 11.5, color: C.inkMuted }}>
        {list.length} 件{filter !== '全部' && ` ${filter}`}{search && ` · "${search}"`}
      </div>

      {/* Grid */}
      <div style={{ padding: '0 22px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {list.map((it) => <Card key={it.id} it={it} url={urls[it.imageId]} onOpen={() => openItem(it)} />)}
        {list.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: C.inkMuted, fontSize: 14 }}>👗 還沒有符合的衣物</div>}
      </div>

      {/* Health entry */}
      <div onClick={openAna} style={{ margin: '0 22px 16px', background: C.surface, borderRadius: 18, border: `1px solid ${C.greenBorder}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>♻️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#2e7d4f' }}>幫久未穿的衣服找主人</div>
          <div style={{ fontSize: 12, color: '#7aaa88', marginTop: 3 }}>衣櫥健檢 · {sleepy} 件久未穿</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#5a9b75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      {/* FAB（限制在 max-w-md 欄內、浮在底部導覽之上）*/}
      <div className="pointer-events-none mx-auto max-w-md" style={{ position: 'fixed', insetInline: 0, bottom: 0, zIndex: 40 }}>
        <button onClick={() => nav('/closet/add')} className="pointer-events-auto" style={{ position: 'absolute', bottom: 96, right: 22, width: 58, height: 58, borderRadius: '50%', background: C.terracotta, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 6px 22px rgba(169,77,40,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </button>
      </div>

      {item && <ItemSheet item={item} url={urls[item.imageId]} visible={sheetIn} onClose={closeItem} onResale={() => nav('/resale')} />}
      {anaOpen && (
        <AnalysisSheet
          visible={anaIn} onClose={closeAna} urls={urls}
          stats={{ totalWears, totalValue, avgCpw, utilization, sleepy }}
          count={items.length} catDist={catDist} wxDist={wxDist} sleepyItems={sleepyItems}
          onPick={(it) => { closeAna(); setTimeout(() => openItem(it), 340); }}
        />
      )}
    </div>
  );
}

// ── 單品 Sheet ───────────────────────────────────────────────────────────
function ItemSheet({ item, url, visible, onClose, onResale }: { item: Item; url?: string; visible: boolean; onClose: () => void; onResale: () => void }) {
  const w = WX[item.wuxing];
  const wear = () => { recordWear(item); onClose(); };
  const remove = async () => { await deleteItem(item.id); onClose(); };
  return (
    <Sheet visible={visible} onClose={onClose}>
      <div style={{ margin: '14px 22px', height: 200, borderRadius: 20, background: item.mainColorHex, position: 'relative', overflow: 'hidden' }}>
        {url && <Sticker src={url} alt={itemName(item)} pad={16} />}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: w.c, fontWeight: 700, border: `1px solid ${w.br}` }}>{w.label} 屬性</div>
        {item.brand && <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,.88)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: C.ink, fontWeight: 600 }}>{item.brand}</div>}
      </div>
      <div style={{ padding: '0 22px 32px' }}>
        <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.ink, marginBottom: 10 }}>{itemName(item)}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {[{ t: item.category, bg: C.purpleBg, c: C.purple }, { t: item.season, bg: '#f0f8f3', c: '#5a9b75' }, { t: `${w.label} 屬性`, bg: w.bg, c: w.c }].map((tag, i) => (
            <span key={i} style={{ padding: '5px 14px', borderRadius: 99, background: tag.bg, color: tag.c, fontSize: 12, fontWeight: 600 }}>{tag.t}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          <Stat label="穿著次數" value={item.wearCount} unit="次" sub={item.wearCount < 4 ? '需要多穿！' : item.wearCount > 15 ? '高利用率' : '一般'} hl={item.wearCount < 4} />
          <Stat label="每次穿著成本" value={item.price ? `$${cpw(item)}` : '—'} sub="Cost Per Wear" hl={!!item.price && cpw(item) > 500} />
          <Stat label="購入價格" value={item.price ? `$${item.price.toLocaleString()}` : '—'} sub={item.brand} />
          <Stat label="利用率" value={item.wearCount < 4 ? '待加強' : item.wearCount > 15 ? '優秀' : '良好'} sub="" hl={item.wearCount < 4} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <button onClick={wear} style={{ flex: 1, padding: 13, borderRadius: 14, border: `1.5px solid ${C.purpleBorder}`, background: C.surface, color: C.purple, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>👕 今天穿了 +1</button>
          <button onClick={onResale} style={{ flex: 1.5, padding: 13, borderRadius: 14, border: 'none', background: C.terracotta, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>♻️ 上架轉售</button>
        </div>
        <button onClick={remove} style={{ width: '100%', padding: 10, border: 'none', background: 'none', color: C.inkMuted, fontSize: 13, cursor: 'pointer' }}>刪除這件單品</button>
      </div>
    </Sheet>
  );
}

// ── 衣櫥分析 Sheet ───────────────────────────────────────────────────────
function AnalysisSheet({ visible, onClose, urls, stats, count, catDist, wxDist, sleepyItems, onPick }: {
  visible: boolean; onClose: () => void; urls: Record<string, string>;
  stats: { totalWears: number; totalValue: number; avgCpw: number; utilization: number; sleepy: number };
  count: number; catDist: { c: Category; n: number; color: string }[]; wxDist: { k: WuXing; n: number }[];
  sleepyItems: Item[]; onPick: (it: Item) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} maxH="90vh">
      <div style={{ padding: '14px 22px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round"><line x1="6" x2="6" y1="20" y2="14" /><line x1="12" x2="12" y1="20" y2="6" /><line x1="18" x2="18" y1="20" y2="10" /></svg>
          <div style={{ ...serif, fontSize: 26, fontWeight: 600, color: C.ink }}>衣櫥分析</div>
        </div>
        <div style={{ fontSize: 12, color: C.inkMuted, marginBottom: 22 }}>統計概覽 + 衣櫥健檢 · 僅供參考</div>

        <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>① 統計概覽</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat label="總穿著次數" value={stats.totalWears} unit="次" sub={`${count} 件單品`} />
          <Stat label="衣櫥總值" value={`$${stats.totalValue.toLocaleString()}`} sub="購入價總和" />
          <Stat label="平均 CPW" value={`$${stats.avgCpw}`} sub="每次穿著成本" hl={stats.avgCpw > 500} />
          <Stat label="利用率" value={stats.utilization} unit="%" sub="≥4 次穿著佔比" hl={stats.utilization < 60} />
        </div>

        <div style={{ background: '#faf9f6', border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Donut data={catDist} total={count} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: C.inkMuted, fontStyle: 'italic', marginBottom: 2 }}>單品類別分布</div>
            {catDist.map(({ c, n, color }) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: C.ink }}>{c}</span>
                <span style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{n}</span>
                <span style={{ width: 38, textAlign: 'right', fontSize: 11, color: C.inkMuted }}>{count ? Math.round(n / count * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#faf9f6', border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: C.inkMuted, fontStyle: 'italic', marginBottom: 12 }}>五行分布</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {wxDist.map(({ k, n }) => {
              const w = WX[k];
              const pct = count ? Math.round(n / count * 100) : 0;
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: w.bg, border: `1px solid ${w.br}`, color: w.c, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{w.label}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 99, background: C.canvas, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: w.c, borderRadius: 99, transition: 'width 400ms ease-out' }} />
                  </div>
                  <span style={{ width: 34, textAlign: 'right', fontSize: 11, color: C.inkSoft }}>{n} 件</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.inkSoft, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
          ② 衣櫥健檢 <span style={{ color: '#5a9b75', fontWeight: 600 }}>· 可行動</span>
        </div>
        <div style={{ background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 16, padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sleepyItems.length ? 6 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2e7d4f' }}>{stats.sleepy} 件久未穿（&lt;4 次）</div>
            <span style={{ fontSize: 11, color: '#7aaa88' }}>利用率 {stats.utilization}%</span>
          </div>
          {sleepyItems.map((it) => (
            <div key={it.id} onClick={() => onPick(it)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', cursor: 'pointer', borderTop: `1px solid ${C.greenBorder}` }}>
              <span style={{ width: 30, height: 30, borderRadius: 8, background: it.mainColorHex, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                {urls[it.imageId] && <img src={urls[it.imageId]} alt={itemName(it)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
              </span>
              <div style={{ flex: 1, fontSize: 12.5, color: C.ink }}>{itemName(it)}</div>
              <span style={{ fontSize: 11, color: C.inkMuted }}>穿 {it.wearCount} 次</span>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#5a9b75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: C.terracotta, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>♻️ 整理後再轉售清單</button>
      </div>
    </Sheet>
  );
}
