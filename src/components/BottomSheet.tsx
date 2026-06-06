// 通用底部彈窗（in-page overlay，不動路由）—— 上架表單 / 市集詳情 / 聊天皮共用。
// z 值高於 BottomNav(z-20)，故會蓋過 tab bar；關閉後恢復。
import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // 鎖背景捲動
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* 遮罩（點擊關閉）。用 token 不寫死 hex。 */}
      <div
        className="absolute inset-0"
        style={{ background: 'color-mix(in srgb, var(--ink) 30%, transparent)' }}
        onClick={onClose}
      />
      {/* 面板 */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[85vh] max-w-md overflow-y-auto rounded-t-panel border-t border-line bg-card p-5"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1.25rem)' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        {title && <h2 className="mb-3 font-serif text-lg text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
