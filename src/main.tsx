import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ensurePersistentStorage } from './platform/storage';
import { loadOpenAIKey } from './engines/openaiKey';

// 啟動時要求持久化儲存，降低 iOS / Safari 清掉 IndexedDB 的風險（真正的安全網見 data/backup.ts）。
ensurePersistentStorage();

// 先把使用者自填的 OpenAI key 載進快取，讓引擎的同步取值（hasOpenAIKey）可用，再渲染。
loadOpenAIKey().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
