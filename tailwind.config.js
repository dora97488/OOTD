/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 背景 / 表面
        paper: 'var(--paper)',
        canvas: 'var(--canvas)',
        'bg-muted': 'var(--bg-muted)',
        card: 'var(--card)',
        surface: 'var(--surface-soft)',
        // 文字
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        inverse: 'var(--inverse)',
        // 邊框
        line: 'var(--line)',
        'line-soft': 'var(--line-soft)',
        // 主行動色（terracotta；seal 為相容舊名）
        terracotta: 'var(--terracotta)',
        'terracotta-dark': 'var(--terracotta-dark)',
        seal: 'var(--seal)',
        // 編輯式點綴
        tomato: 'var(--tomato)',
        leaf: 'var(--leaf)',
        cream: 'var(--cream)',
        navy: 'var(--navy)',
        gold: 'var(--gold)',
        // 五行功能色
        wood: 'var(--wood)',
        fire: 'var(--fire)',
        earth: 'var(--earth)',
        metal: 'var(--metal)',
        water: 'var(--water)',
      },
      fontFamily: {
        // 襯線（標題 / 數字 / tab / CTA）：拉丁用 Cormorant Garamond，中文 fallback 思源/宋體
        serif: ['"Cormorant Garamond"', '"Noto Serif TC"', '"Songti TC"', 'serif'],
        // 無襯線（功能性內容）：Inter + 中文 fallback
        sans: ['"Inter"', '"Noto Sans TC"', '"PingFang TC"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '22px',
        panel: '26px',
        pill: '999px',
      },
      boxShadow: {
        // 編輯式：幾乎無陰影，靠對比與留白營造層次（不要用強陰影）
        card: '0 1px 2px rgba(30,30,28,0.04)',
        paper: '0 1px 2px rgba(30,30,28,0.04)',
      },
    },
  },
  plugins: [],
};
