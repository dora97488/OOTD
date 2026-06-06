// 功能插槽：尚未實作的頁面用這個顯示「接手說明」，各區負責人把內容換掉即可。
interface Props {
  area: string;        // 區塊名（對應 IA）
  phase?: string;      // 階段標記
  owner?: string;      // 負責人（填名字）
  todo: string;        // 要做什麼
  spec?: string;       // 對應規格章節
}

export default function Placeholder({ area, phase = 'P0', owner = '（待認領）', todo, spec }: Props) {
  return (
    <div className="px-5 py-8">
      <div className="rounded-2xl border border-dashed border-line bg-card p-6 shadow-card">
        <div className="flex items-center gap-2">
          <span className="chip">建置中</span>
          <span className="chip">{phase}</span>
        </div>
        <h2 className="mt-3 font-serif text-2xl text-ink">{area}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{todo}</p>
        <div className="mt-4 space-y-1 text-xs text-muted">
          <div>負責人：{owner}</div>
          {spec && <div>規格：{spec}</div>}
        </div>
      </div>
    </div>
  );
}
