// 轉售（Tab 3）Phase 0：建議轉售／我的在售／一鍵上架為真資料（本機 listings）；
// 市集「逛逛別人的衣櫥」為 mock 皮（含商品詳情、五行適配度、站內聊天皮、個人化排序）。
// 不接後端/買家/金流。資料一律走 src/data/；五行喜忌處標「僅供參考」。
import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import {
  listItems,
  listListings,
  addListing,
  updateListing,
  deleteListing,
  getImageURL,
  getProfile,
  listMarket,
  listWearLogs,
} from '../data';
import type { Item, Listing, WuXing } from '../db/db';
import { type MarketListing, marketImageURL } from '../data/market';
import { suggestResale, cpw, wuxingFit, recentWearCounts } from '../engines/recommend';
import { WUXING_HEX } from '../constants/colors';
import PageHeader from '../components/PageHeader';
import BottomSheet from '../components/BottomSheet';

export default function Resale() {
  const items = useLiveQuery(() => listItems(), [], []);
  const listings = useLiveQuery(() => listListings(), [], []);
  const wearlogs = useLiveQuery(() => listWearLogs(), [], []);
  const profile = useLiveQuery(() => getProfile());

  const fav = profile?.favorable ?? [];
  const unfav = profile?.unfavorable ?? [];

  const candidates = suggestResale(items);
  const recent = recentWearCounts(wearlogs); // itemId → 近 90 天穿著次數
  const hasLogs = wearlogs.length > 0; // 尚無穿搭記錄時退回顯示累積次數
  const myListings = listings.filter((l) => l.status === 'listed_local' || l.status === 'sold');
  const market = [...listMarket()].sort(
    (a, b) => wuxingFit(b.wuxing, fav, unfav) - wuxingFit(a.wuxing, fav, unfav) // 個人化推薦排序
  );

  const [listingTarget, setListingTarget] = useState<Item | null>(null);
  const [marketTarget, setMarketTarget] = useState<MarketListing | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div>
      <PageHeader en="Resale" title="幫衣服找下個主人" sub="90 天沒穿 / CPW 偏高的單品 · 二手轉售" />

      <div className="space-y-6 px-5">
        <HowItWorks />

        {/* 建議轉售（真資料） */}
        <section>
          <SectionTitle badge="真資料">建議轉售（{candidates.length}）</SectionTitle>
          {candidates.length === 0 ? (
            <EmptyCard>目前沒有閒置太久的單品。</EmptyCard>
          ) : (
            <div className="space-y-2">
              {candidates.map((i) => (
                <SuggestRow
                  key={i.id}
                  item={i}
                  recent={recent[i.id] ?? 0}
                  hasLogs={hasLogs}
                  onList={() => setListingTarget(i)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 我的在售（真資料） */}
        <section>
          <SectionTitle>我的在售（{myListings.length}）</SectionTitle>
          {myListings.length === 0 ? (
            <EmptyCard>尚無上架商品。從上方「建議轉售」一鍵上架吧。</EmptyCard>
          ) : (
            <div className="space-y-2">
              {myListings.map((l) => (
                <MyListingRow key={l.id} listing={l} item={items.find((i) => i.id === l.itemId)} />
              ))}
            </div>
          )}
        </section>

        {/* 市集探索（mock 皮） */}
        <section>
          <SectionTitle>逛逛別人的衣櫥</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {market.map((m) => (
              <MarketCard
                key={m.id}
                listing={m}
                onClick={() => setMarketTarget(m)}
              />
            ))}
          </div>
          {profile && (
            <p className="mt-2 text-xs text-faint">＊已依你的五行喜用排序，適配標示僅供參考。</p>
          )}
        </section>
      </div>

      {/* 上架表單 Sheet */}
      <BottomSheet open={!!listingTarget} onClose={() => setListingTarget(null)} title="上架到二手市集">
        {listingTarget && <ListingForm item={listingTarget} onDone={() => setListingTarget(null)} />}
      </BottomSheet>

      {/* 市集商品詳情 Sheet（聊天開啟時暫隱，關閉聊天後復現） */}
      <BottomSheet
        open={!!marketTarget && !chatOpen}
        onClose={() => setMarketTarget(null)}
        title={marketTarget?.name}
      >
        {marketTarget && (
          <MarketDetail
            listing={marketTarget}
            fav={fav}
            unfav={unfav}
            hasProfile={!!profile}
            onChat={() => setChatOpen(true)}
          />
        )}
      </BottomSheet>

      {/* 站內聊天皮 Sheet */}
      <BottomSheet open={chatOpen} onClose={() => setChatOpen(false)} title="聊聊">
        <ChatSkin seller={marketTarget?.seller} />
      </BottomSheet>
    </div>
  );
}

// ── 運作方式（淡綠卡，對齊線稿）─────────────────────────────
function HowItWorks() {
  const rows = [
    { icon: '🔍', title: '自動追蹤', desc: '系統記錄每件衣物的穿著次數' },
    { icon: '⏱️', title: '90 天未穿', desc: '自動加入「建議轉售」清單' },
    { icon: '✨', title: '一鍵上架', desc: 'AI 幫你生成商品描述' },
  ];
  return (
    <div
      className="rounded-2xl border border-line p-4 shadow-card"
      style={{ background: 'color-mix(in srgb, var(--leaf) 12%, var(--card))' }}
    >
      <div className="font-serif text-leaf">運作方式</div>
      <div className="mt-3 space-y-3">
        {rows.map((r) => (
          <div key={r.title} className="flex items-start gap-3">
            <span className="text-lg leading-none">{r.icon}</span>
            <div>
              <div className="text-sm font-medium text-ink">{r.title}</div>
              <div className="text-xs text-muted">{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 建議轉售列 ────────────────────────────────────────────
function SuggestRow({
  item,
  recent,
  hasLogs,
  onList,
}: {
  item: Item;
  recent: number;
  hasLogs: boolean;
  onList: () => void;
}) {
  const name = item.name ?? `${item.colorName}${item.category}`;
  // 有穿搭記錄 → 近 90 天實際次數；尚無記錄 → 退回累積次數（避免誤導成 0）。
  const wearText = hasLogs ? `近 90 天穿 ${recent} 次` : `穿 ${item.wearCount} 次`;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-card">
      <Thumb imageId={item.imageId} hex={item.mainColorHex} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{name}</div>
        <div className="mt-0.5 text-xs text-muted">
          {wearText}・CPW {item.price ? `$${cpw(item).toFixed(0)}` : '—'}
        </div>
      </div>
      <button onClick={onList} className="shrink-0 text-sm font-medium text-seal">
        上架 ›
      </button>
    </div>
  );
}

// ── 我的在售列 ────────────────────────────────────────────
function MyListingRow({ listing, item }: { listing: Listing; item?: Item }) {
  const name = item ? item.name ?? `${item.colorName}${item.category}` : '已刪除的單品';
  const sold = listing.status === 'sold';
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-card">
      <Thumb imageId={item?.imageId} hex={item?.mainColorHex} className="h-16 w-16" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-ink">{name}</span>
          <span className="chip">{sold ? '已售' : '在售'}</span>
        </div>
        <div className="mt-0.5 font-serif text-seal">NT$ {listing.price}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {!sold && (
          <button onClick={() => updateListing(listing.id, { status: 'sold' })} className="text-xs text-muted">
            標記已售
          </button>
        )}
        <button onClick={() => deleteListing(listing.id)} className="text-xs text-fire">
          下架
        </button>
      </div>
    </div>
  );
}

// ── 市集卡 ────────────────────────────────────────────────
function MarketCard({
  listing,
  onClick,
}: {
  listing: MarketListing;
  onClick: () => void;
}) {
  const img = marketImageURL(listing.image);
  return (
    <button onClick={onClick} className="overflow-hidden rounded-card border border-line bg-card text-left shadow-card">
      <div className="relative aspect-square bg-paper">
        {img ? (
          <img src={img} alt={listing.name} className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full w-full place-items-center text-5xl">{listing.emoji}</div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium text-ink">{listing.name}</div>
        <div className="mt-1 font-serif text-lg text-seal">NT$ {listing.price}</div>
        <div className="mt-0.5 text-xs text-faint">{listing.seller}</div>
      </div>
    </button>
  );
}

// ── 上架表單（Sheet 內容）─────────────────────────────────
const DESC_TEMPLATES: ((i: Item) => string)[] = [
  (i) =>
    `${i.brand ? i.brand + ' ' : ''}${i.colorName}${i.category}，${i.season}適穿${
      i.material ? '，' + i.material : ''
    }。輕微使用痕跡，照片實拍，誠可小議。`,
  (i) =>
    `轉售自用 ${i.brand ? i.brand + ' ' : ''}${i.colorName}${i.category}。${i.season}百搭款，狀況良好，給有緣人。`,
  (i) =>
    `衣櫥斷捨離🌿 ${i.colorName}${i.category}${i.brand ? '（' + i.brand + '）' : ''}，${i.season}必備。九成新、無瑕疵。`,
];

function ListingForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const name = item.name ?? `${item.colorName}${item.category}`;
  const [price, setPrice] = useState(item.price ? String(item.price) : '');
  const [tplIdx, setTplIdx] = useState(0);
  const [desc, setDesc] = useState(() => DESC_TEMPLATES[0](item));

  const regen = () => {
    const next = (tplIdx + 1) % DESC_TEMPLATES.length;
    setTplIdx(next);
    setDesc(DESC_TEMPLATES[next](item));
  };

  const submit = async () => {
    await addListing({
      id: uuid(),
      itemId: item.id,
      price: Number(price) || 0,
      description: desc,
      status: 'listed_local',
      createdAt: Date.now(),
    });
    onDone();
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <Thumb imageId={item.imageId} hex={item.mainColorHex} className="h-16 w-16" />
        <div className="font-medium text-ink">{name}</div>
      </div>

      <div className="mt-5 text-sm text-ink">定價（NT$）</div>
      <input
        type="number"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="例：380"
        className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-3"
      />

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-ink">商品描述</span>
        <button onClick={regen} className="text-xs text-seal">
          ✨ 重新生成
        </button>
      </div>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={4}
        className="mt-2 w-full resize-none rounded-xl border border-line bg-card px-4 py-3 text-sm"
      />

      <button
        onClick={submit}
        disabled={!price}
        className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white disabled:opacity-40"
      >
        確認上架
      </button>
      <p className="mt-2 text-center text-xs text-faint">僅上架到本機（Phase 0），不會真的賣出。</p>
    </div>
  );
}

// ── 市集商品詳情（Sheet 內容）────────────────────────────
function MarketDetail({
  listing,
  fav,
  unfav,
  hasProfile,
  onChat,
}: {
  listing: MarketListing;
  fav: WuXing[];
  unfav: WuXing[];
  hasProfile: boolean;
  onChat: () => void;
}) {
  const fit = wuxingFit(listing.wuxing, fav, unfav);
  const fitLabel = fit >= 2 ? `${listing.wuxing}（喜用）` : fit < 0 ? '五行偏忌' : '中性';
  const img = marketImageURL(listing.image);
  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-paper">
        {img ? (
          <img src={img} alt={listing.name} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-7xl">{listing.emoji}</div>
        )}
      </div>
      <div className="mt-4 font-serif text-3xl text-seal">NT$ {listing.price}</div>
      <div className="mt-1 text-sm text-muted">
        {listing.category}・賣家 {listing.seller}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{listing.desc}</p>

      {hasProfile && (
        <div className="mt-4 flex items-center gap-2">
          <span className="wuxing-dot" style={{ background: WUXING_HEX[listing.wuxing] }} />
          <span className="text-sm text-muted">搭配你的五行：{fitLabel}</span>
          <span className="chip">僅供參考</span>
        </div>
      )}

      <button onClick={onChat} className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white">
        聊聊
      </button>
      <p className="mt-2 text-center text-xs text-faint">交易功能即將推出（Phase 2）。</p>
    </div>
  );
}

// ── 站內聊天皮（Sheet 內容）──────────────────────────────
function ChatSkin({ seller }: { seller?: string }) {
  return (
    <div>
      <div className="text-xs text-faint">與 {seller ?? '賣家'} 的對話</div>
      <div className="mt-3 space-y-2">
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-canvas px-3 py-2 text-sm text-ink">
          嗨～這件還在唷！有興趣嗎？😊
        </div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-seal px-3 py-2 text-sm text-white">
          請問可以小議嗎？
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-canvas px-3 py-2 text-sm text-ink">
          可以唷，面交再折 $20！
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {['還在嗎？', '可面交嗎？', '能小議嗎？'].map((q) => (
          <span key={q} className="chip">
            {q}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <input
          disabled
          placeholder="站內聊天即將推出…"
          className="flex-1 rounded-xl border border-line bg-canvas px-4 py-3 text-sm"
        />
        <button disabled className="rounded-xl bg-seal px-4 py-3 text-sm text-white opacity-40">
          送出
        </button>
      </div>
    </div>
  );
}

// ── 共用小元件 ────────────────────────────────────────────
function SectionTitle({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="font-serif text-lg text-ink">{children}</h2>
      {badge && <span className="chip">{badge}</span>}
    </div>
  );
}

function EmptyCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-muted shadow-card">
      {children}
    </div>
  );
}

// 縮圖：載入 IndexedDB 圖片 objectURL，無圖時顯示主色塊。
function Thumb({ imageId, hex, className = '' }: { imageId?: string; hex?: string; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let revoke: string | undefined;
    getImageURL(imageId).then((u) => {
      revoke = u;
      setUrl(u);
    });
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [imageId]);
  return (
    <div className={`shrink-0 overflow-hidden rounded-lg border border-line bg-paper ${className}`}>
      {url ? (
        <img src={url} className="h-full w-full object-contain" />
      ) : (
        <div className="h-full w-full" style={{ background: hex ?? 'var(--line)' }} />
      )}
    </div>
  );
}
