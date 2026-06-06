import { NavLink, useNavigate } from 'react-router-dom';

const tabs = [
  { to: '/', label: '首頁', end: true },
  { to: '/closet', label: '衣櫥' },
  { to: '/resale', label: '轉售' },
  { to: '/profile', label: '我的' },
];

export default function BottomNav() {
  const nav = useNavigate();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="relative mx-auto grid max-w-md grid-cols-4">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs ${
                isActive ? 'text-seal' : 'text-muted'
              }`
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {t.label}
          </NavLink>
        ))}

        {/* 中央新增鍵 */}
        <button
          onClick={() => nav('/closet/add')}
          aria-label="新增衣物"
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-seal text-2xl leading-none text-white shadow-card"
        >
          ＋
        </button>
      </div>
    </nav>
  );
}
