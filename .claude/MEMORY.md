# MEMORY

跨對話的長效事實、偏好、決定。新內容追加在最後。

---

### 2026-06-07

- OOTD 的 onboarding 開場動畫元件是 `src/screens/OnboardingIntro.tsx`：信封開封後衣物「掉進」信封、疊成一束，結尾出現「Today」。動畫所有可調參數（衣服座標 CLOTHES、時間常數 OPEN_AT/DROP_START/DROP_STEP/DROP_DUR、CSS keyframes、漸層背景 INTRO_BG、前袋遮罩 clip-path）都集中在這個檔案內，keyframes 用元件內 `<style>` 注入、不動 index.css token。
- 調 onboarding 動畫有一支獨立工具 `wardrobe-prototype/onboarding-intro.html`，瀏覽器直接打開即可（吃同層 `img/` 素材）：可拖曳衣服位置、可視化編輯 clip-path 頂點、調速度、匯出 CLOTHES 陣列回貼。它的命名與 keyframes 與 OnboardingIntro.tsx 對齊，改完把值抄回 tsx。
- onboarding 動畫衣物座標系統：`cx`=中心 x、`by`=底部 y（相對信封 stack 左上，單位 px，stack 尺寸 `ENV_W=240 × ENV_H≈310`）、`w`=顯示寬、`rot`=旋轉度。掉落順序＝CLOTHES 陣列順序＝去背檔名編號 1→8，z-index 同序（後掉的疊在前面）。
- onboarding 動畫素材在 `wardrobe-prototype/img/`：`envelope_1`（闔）、`envelope_2`（開）、`cutout_*`（去背單品）、`outfit_oracle.svg`、`today.svg`；`1.png`~`10.png` 是這支動畫的分鏡參考圖（不是程式用素材）。
- onboarding 只在「使用者尚無命盤 profile」時出現（App.tsx 守門 `!profile → /onboarding`）。要重看開場動畫：開無痕視窗，或刪掉 IndexedDB 名為 `ootd` 的資料庫後重新整理。
- 本機開發 dev server 跑在 `localhost:5181`（另有 5180）。
