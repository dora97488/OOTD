import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getItem, recordWear, deleteItem, getImageURL } from '../data';
import { cpw } from '../engines/recommend';
import { WUXING_HEX } from '../constants/colors';

export default function ItemDetail() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const item = useLiveQuery(() => getItem(id), [id]);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let revoke: string | undefined;
    if (item) getImageURL(item.imageId).then((u) => { revoke = u; setUrl(u); });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item?.imageId]);

  if (!item) return <div className="p-10 text-center text-muted">載入中…</div>;

  const wearOnce = () => recordWear(item);
  const remove = async () => {
    await deleteItem(item.id); // 連同去背圖 / 原圖一起清掉（見 data/items.ts）
    nav('/closet', { replace: true });
  };

  return (
    <div className="px-5 py-5">
      <button onClick={() => nav(-1)} className="text-muted">← 返回</button>
      <div className="mx-auto mt-3 aspect-square w-64 overflow-hidden rounded-2xl border border-line bg-paper">
        {url && <img src={url} className="h-full w-full object-contain" />}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="wuxing-dot" style={{ background: WUXING_HEX[item.wuxing] }} />
        <span className="font-serif text-xl">{item.category}</span>
        <span className="chip">{item.colorName}・{item.wuxing}</span>
        <span className="chip">{item.season}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-center">
        <Stat label="穿著次數" value={`${item.wearCount}`} />
        <Stat label="CPW" value={item.price ? `$${cpw(item).toFixed(0)}` : '—'} />
      </div>

      <button onClick={wearOnce} className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white">
        今天穿了 +1
      </button>
      <button onClick={remove} className="mt-2 w-full py-2.5 text-sm text-fire">刪除</button>

      {/* TODO(衣櫥負責人)：編輯欄位、加入穿搭、上架轉售入口 */}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card py-3">
      <div className="font-serif text-2xl text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
