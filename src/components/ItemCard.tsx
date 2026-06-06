import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '../db/db';
import { getImageURL } from '../data';
import { WUXING_HEX } from '../constants/colors';

export default function ItemCard({ item }: { item: Item }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    let revoke: string | undefined;
    getImageURL(item.imageId).then((u) => {
      revoke = u;
      setUrl(u);
    });
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [item.imageId]);

  return (
    <Link to={`/closet/item/${item.id}`} className="block">
      <div className="aspect-square overflow-hidden rounded-xl border border-line bg-paper">
        {url ? (
          <img src={url} alt={item.colorName} className="h-full w-full object-contain" />
        ) : (
          <div className="h-full w-full animate-pulse bg-line/40" />
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
        <span className="wuxing-dot" style={{ background: WUXING_HEX[item.wuxing] }} />
        <span className="text-xs text-muted">{item.category}・{item.wuxing}</span>
      </div>
    </Link>
  );
}
