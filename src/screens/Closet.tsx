import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CATEGORIES, type Category } from '../db/db';
import { listItems } from '../data';
import ItemCard from '../components/ItemCard';
import PageHeader from '../components/PageHeader';

export default function Closet() {
  const [filter, setFilter] = useState<Category | '全部'>('全部');
  const items = useLiveQuery(() => listItems(), [], []);
  const shown = filter === '全部' ? items : items.filter((i) => i.category === filter);

  return (
    <div>
      <PageHeader title="衣櫥" sub={`${items.length} 件單品`} />

      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        {(['全部', ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              filter === c ? 'border-seal bg-seal text-white' : 'border-line bg-card text-muted'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="px-5 py-20 text-center">
          <p className="text-muted">還沒有衣物</p>
          <Link to="/closet/add" className="mt-3 inline-block rounded-xl bg-seal px-5 py-2.5 text-sm text-white">
            拍第一件
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 px-5">
          {shown.map((i) => (
            <ItemCard key={i.id} item={i} />
          ))}
        </div>
      )}
    </div>
  );
}
