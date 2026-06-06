export default function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="px-5 pb-2 pt-5">
      <h1 className="font-serif text-2xl text-ink">{title}</h1>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
    </header>
  );
}
