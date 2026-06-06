// 轉售：Phase 0「畫面 only」。建議轉售清單用共用 recommend.suggestResale（真資料、會動）；
// 上架/在售為擬真畫面，存本機 listings（走 data/ 的 addListing，不接市集/買家/金流）。
import { useLiveQuery } from 'dexie-react-hooks';
import { listItems } from '../data';
import { suggestResale } from '../engines/recommend';
import PageHeader from '../components/PageHeader';

export default function Resale() {
  const items = useLiveQuery(() => listItems(), [], []);
  const candidates = suggestResale(items);

  return (
    <div>
      <PageHeader title="幫衣服找下個主人" sub="90 天沒穿 / CPW 偏高的單品" />

      <div className="px-5">
        <div className="rounded-2xl border border-line bg-card p-4 text-sm shadow-card">
          <div className="font-medium text-ink">建議轉售（{candidates.length}）</div>
          {candidates.length === 0 ? (
            <p className="mt-2 text-muted">目前沒有閒置太久的單品。</p>
          ) : (
            <ul className="mt-2 space-y-1 text-muted">
              {candidates.slice(0, 8).map((i) => (
                <li key={i.id}>・{i.category}・{i.colorName}（穿 {i.wearCount} 次）</li>
              ))}
            </ul>
          )}
        </div>

        {/* TODO(轉售負責人)：上架表單（定價/AI描述/拍照）→ addListing(status='listed_local')；
            我的在售列表 + 下架；「買家訊息 / 市集」Phase 2 接後端，先放「即將推出」。 */}
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-muted shadow-card">
          上架表單 / 我的在售 / 市集 —— 畫面待補（後端為 Phase 2）。規格 §5.5
        </div>
      </div>
    </div>
  );
}
