// App 殼：HashRouter 路由 + onboarding 守門 + 底部導覽（BottomNav：Rainie tabbar 設計 + prototype lucide icon）。
// 全螢幕手機殼（max-w-md，可捲動），不用桌面手機框；各功能頁掛在 <Routes>。
// 新增頁面：加一條 <Route> 並在 screens/ 放對應檔。HashRouter 為相容 GitHub Pages / Capacitor，勿改 BrowserRouter。
import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getProfile } from './data';
import { warmUpBackgroundRemover } from './engines/bgRemove';
import BottomNav from './components/BottomNav';

import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Closet from './screens/Closet';
import AddItem from './screens/AddItem';
import ItemDetail from './screens/ItemDetail';
import Outfits from './screens/Outfits';
import OutfitBuilder from './screens/OutfitBuilder';
import Resale from './screens/Resale';
import Profile from './screens/Profile';

const LOADING = '__loading__';
// 不顯示底部導覽的全螢幕頁面
const FULLSCREEN = ['/onboarding', '/closet/add'];
// 暖紙漸層底（沿用原 .phone-screen 質感）
const SHELL_BG = 'linear-gradient(180deg, #fffefd 0%, #faf7f1 70%, #efeae2 100%)';

function Shell() {
  const loc = useLocation();
  const profile = useLiveQuery(() => getProfile(), [], LOADING as any);

  if (profile === LOADING) {
    return (
      <div className="grid place-items-center" style={{ minHeight: '100dvh' }}>
        <span className="font-serif text-3xl tracking-widest" style={{ color: '#ea5f45' }}>OOTD</span>
      </div>
    );
  }

  // 首次使用：尚無命盤 → 導向 onboarding
  if (!profile && loc.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  // 已建檔卻停在 onboarding → 回首頁
  if (profile && loc.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  const showNav = !FULLSCREEN.includes(loc.pathname);

  return (
    <div
      className="mx-auto max-w-md"
      style={{ position: 'relative', overflowX: 'hidden', minHeight: '100dvh', background: SHELL_BG, paddingTop: 'var(--safe-top)' }}
    >
      <div style={showNav ? { paddingBottom: 'calc(108px + var(--safe-bottom))' } : undefined}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Home />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/closet/add" element={<AddItem />} />
          <Route path="/closet/item/:id" element={<ItemDetail />} />
          <Route path="/outfits" element={<Outfits />} />
          <Route path="/outfits/new" element={<OutfitBuilder />} />
          <Route path="/resale" element={<Resale />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  // 閒置時預熱去背 WASM 模型（數十 MB），讓使用者首次拍照「去背中…」幾乎秒過。
  // 放 App 啟動而非 onboarding：首訪（填生辰時）與回訪都涵蓋。失敗不影響 App。
  useEffect(() => {
    const warm = () => { void warmUpBackgroundRemover(); };
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(warm, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    // Safari 沒有 requestIdleCallback → 退而求其次延遲觸發，不卡首屏渲染。
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
