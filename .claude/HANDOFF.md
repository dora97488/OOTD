# HANDOFF

> 最後更新：2026-06-07 18:30

## 這次做了什麼
- 做了 onboarding 開場連續動畫 `OnboardingIntro`：信封落下 → 開封 → 9 件去背衣物依檔名 1→8 順序「掉進」信封口疊成一束 → 左上「Outfit Oracle」、結尾「Today」浮現 → 淡出進五行表單。可點擊跳過、尊重 prefers-reduced-motion。
- 把第 2 件原本的 `cutout_skirt_2`（裙＋洋裝合圖）拆成兩件：`cutout_skirt_brown_2` + `cutout_dress_2`。
- 衣服最終座標已用調整工具拉好並回貼（9 件 cx/by/w/rot 都更新）。
- 前袋遮罩 clip-path 改成 `polygon(0% 44%, 12% 46%, 35% 65%, 64% 65%, 88% 45%, 97% 45%, 97% 100%, 50% 100%, 0% 100%)`，標題 Outfit Oracle / Today 位置與大小也調過、移除信封 drop-shadow。
- 做了獨立調整工具 `wardrobe-prototype/onboarding-intro.html`（拖曳衣服、可視化編輯 clip-path、匯出值回貼）。
- 已 commit（`1ad457e`）並 push 到 `origin/wardrobe-database-wen`（連同 session 前的 AddItem/openaiKey/settings/db 等 WIP 一起）。

## 改動的檔案
- `src/screens/OnboardingIntro.tsx` → 新增，整個動畫元件（CLOTHES 陣列、時間常數、CSS keyframes 都在這）
- `src/screens/Onboarding.tsx` → 加 `intro` state，先播動畫再顯示表單
- `wardrobe-prototype/onboarding-intro.html` → 獨立調整工具
- `wardrobe-prototype/img/` → envelope_1/2、cutout_*（含新拆的 skirt_brown_2 / dress_2）、outfit_oracle.svg、today.svg、分鏡 1~10.png

## 目前狀態
- 動畫已可運作、type-check 通過、已 push。沒有卡住。
- 要在 App 看效果：開無痕視窗進 `localhost:5181`，或刪掉 IndexedDB 的 `ootd` 資料庫重新整理（onboarding 只在「尚無命盤 profile」時出現）。

## TODO（下次從這裡接）
- [ ] 調 onboarding 頁面的**漸層背景色**（目前 `INTRO_BG = linear-gradient(180deg, #FFFEFD 0%, #F2F0EA 100%)`，在 OnboardingIntro.tsx 與 html 的 `.phone` 各一份）
- [ ] 調**衣服最後一個分鏡動畫**（最後一件 `cutout_outer_8` 落定、或整體收尾 / Today 出現的時機與動態）
- [ ] 調**起始的信封大小**（`ENV_W = 240`，連動 `ENV_H`；闔上信封 envelope_1 顯示為 width:100%）

## 給明天的我的備註
- 調整流程：先在 `wardrobe-prototype/onboarding-intro.html` 用瀏覽器拉好（編輯模式拖衣服、編輯遮罩拉 clip-path、速度滑桿、匯出 CLOTHES），再把值貼回 `OnboardingIntro.tsx`。html 與 tsx 的命名/keyframes 刻意對齊。
- tsx 版 CLOTHES 的 `src` 是 import 變數（如 `cutoutOuter8`），回貼時只改 `cx/by/w/rot` 數字。
- 改共用檔（db/data/platform/index.css token/路由表）前要先喊一聲（CLAUDE.md 慣例 5）；這次動畫沒動到這些。
