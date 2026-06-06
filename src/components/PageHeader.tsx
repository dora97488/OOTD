// 共用頁首。給 `en` 時採衣櫥（Closet）招牌排版：大英文襯線標題 + 中文副標 + 漸層分隔線，
// 讓「轉售 / 我的」與「衣櫥 / 今天」視覺一致。不給 `en` 則維持原本精簡樣式（Outfits 等沿用）。
export default function PageHeader({
  title,
  sub,
  en,
}: {
  title: string;
  sub?: string;
  en?: string;
}) {
  if (en) {
    return (
      <header className="px-5 pb-1 pt-5">
        <h1 className="font-serif leading-[1.05] text-ink" style={{ fontSize: 32, fontWeight: 600 }}>
          {en}
        </h1>
        <p className="mt-1 text-sm font-medium text-terracotta">{title}</p>
        {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
        <div
          className="mt-3"
          style={{ height: 1, background: 'linear-gradient(90deg, rgba(169,77,40,.28), var(--line))' }}
        />
      </header>
    );
  }

  return (
    <header className="px-5 pb-2 pt-5">
      <h1 className="font-serif text-2xl text-ink">{title}</h1>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </header>
  );
}
