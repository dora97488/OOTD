import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensurePersistentStorage } from './platform/storage';

// 啟動時要求持久化儲存，降低 iOS / Safari 清掉 IndexedDB 的風險（真正的安全網見 data/backup.ts）。
ensurePersistentStorage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
