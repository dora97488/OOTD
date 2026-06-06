// 底部導覽 —— 視覺沿用 Rainie 的 tabbar 設計（index.css 的 .bottom-nav / .nav-item / .nav-icon，
// 膠囊底＋選中 terracotta #ea5f45＋選中 icon 圓角方塊底）。
// icon 統一使用 wardrobe-prototype/closet-prototype.jsx 的 lucide 線條（home / shirt / trade / user）。
// icon 不設 stroke/fill，交給 `.nav-icon svg` CSS（fill:none; stroke:currentColor）→ 選中色自動流動。
import { NavLink } from 'react-router-dom';

const ICONS: Record<string, JSX.Element> = {
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  shirt: <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />,
  trade: <><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
};

const tabs = [
  { to: '/', label: '今天', icon: 'home', end: true },
  { to: '/closet', label: '衣櫥', icon: 'shirt' },
  { to: '/resale', label: '轉售', icon: 'trade' },
  { to: '/profile', label: '我的', icon: 'user' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[t.icon]}</svg>
          </span>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
