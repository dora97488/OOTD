import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' 讓打包後可放在 GitHub Pages 子路徑；搭配 HashRouter 避免靜態主機的路由 404。
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      // circular-natal-horoscope-js 的 package.json main/module 欄位有誤（指到不存在的入口），
      // 手動指向實際打包檔，讓 vite/rollup 解析得到。型別仍走套件的 types 欄位（tsc 不受影響）。
      'circular-natal-horoscope-js': fileURLToPath(
        new URL('./node_modules/circular-natal-horoscope-js/dist/index.js', import.meta.url)
      ),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'OOTD — Outfit Oracle Today',
        short_name: 'OOTD',
        description: '結合命理與天氣的電子衣櫥。Never stress over what to wear.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F6F2',
        theme_color: '#A94D28',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell 預快取；@imgly 的去背模型較大，首次線上載入後再快取。
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
});
