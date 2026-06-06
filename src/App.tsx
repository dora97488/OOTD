import { HashRouter } from 'react-router-dom';
import Home from './screens/Home';

function NavIcon({ kind }: { kind: 'today' | 'closet' | 'resale' | 'me' }) {
  if (kind === 'today') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3.5v4M16 3.5v4M4 9h16M8 13h3M13 13h3M8 17h3" />
      </svg>
    );
  }

  if (kind === 'closet') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 7.5h10l2 3.5-2.2 7H7.2L5 11l2-3.5Z" />
        <path d="M9 7.5a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  if (kind === 'resale') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 8.5 12 4l5 4.5" />
        <path d="M9 15.5 12 18l3-2.5" />
        <path d="M8 9.5h8M8.5 14.5h7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z" />
      <path d="M4.8 12h1.6M17.6 12h1.6M12 4.8v1.6M12 17.6v1.6M6.9 6.9l1.1 1.1M16 16l1.1 1.1M6.9 17.1 8 16M16 8l1.1-1.1" />
    </svg>
  );
}

export default function App() {
  return (
    <main className="ootd-demo">
      <div className="ambient-line ambient-line-left" />
      <div className="ambient-line ambient-line-right" />

      <section className="phone-stage">
        <div className="phone-shell">
          <div className="phone-notch" />

          <div className="phone-screen">
            {/* 首頁實機（PRD 雙態 + 占卜切換 + 天氣 + 月曆 + Sheet）。HashRouter 為相容 GitHub Pages / Capacitor。 */}
            <HashRouter>
              <Home />
            </HashRouter>

            <nav className="bottom-nav" aria-label="Primary">
              <button type="button" className="nav-item is-active">
                <span className="nav-icon"><NavIcon kind="today" /></span>
                <span>今天</span>
              </button>
              <button type="button" className="nav-item">
                <span className="nav-icon"><NavIcon kind="closet" /></span>
                <span>衣櫥</span>
              </button>
              <button type="button" className="nav-item">
                <span className="nav-icon"><NavIcon kind="resale" /></span>
                <span>轉售</span>
              </button>
              <button type="button" className="nav-item">
                <span className="nav-icon"><NavIcon kind="me" /></span>
                <span>我的</span>
              </button>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}
