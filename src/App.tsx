// App 殼：HashRouter 路由 + onboarding 守門 + 底部導覽。
// 各功能頁掛在 <Routes> 下；新增頁面就加一條 <Route> 並在 screens/ 放對應檔。
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getProfile } from './data';
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

function Shell() {
  const loc = useLocation();
  const profile = useLiveQuery(() => getProfile(), [], LOADING as any);

  if (profile === LOADING) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <span className="font-serif text-3xl tracking-widest text-seal">OOTD</span>
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
    <div className="mx-auto min-h-full max-w-md" style={{ paddingTop: 'var(--safe-top)' }}>
      <div className={showNav ? 'pb-24' : ''}>
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
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
