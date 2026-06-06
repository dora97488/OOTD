# OOTD — 開工流程（給開發者 & Claude Code）

> 把「拿到骨架後，怎麼開始用 Claude Code 一步步實作」從頭到尾講清楚的 runbook。
>
> **如果你是 Claude Code 在讀這份：** 本 repo 的程式慣例在 `CLAUDE.md`（你會自動讀取）、產品規格在 `docs/`、功能分工在 `README.md`。你的任務通常是「實作某個功能插槽」，請依下方「§4 任務指派」的方式進行。
>
> 文中標 **【你來做】** 的是開發者在終端機/瀏覽器手動完成的步驟，Claude Code 不需要自己做。

---

## 0. 這個專案現在的狀態

- **Phase 0 骨架**：能跑、能裝、能離線的純本機 PWA（資料存 IndexedDB），WASM 去背，**無後端**。已驗證可 `npm run build`。
- **已做好的共用基礎建設**：資料層（Dexie）、路由＋首次守門＋底部導覽、五個共用引擎（去背 / 抽色 / 顏色對五行 / 農民曆 / 推薦）、五行設計 token。
- **已串成可跑的參考迴圈**：onboarding（輸生辰→算八字喜忌→存）→ 新增衣物（拍照→去背→抽色→對五行→存）→ 衣櫥列表 → 單品詳情。
- **待補**：各功能插槽，對照表見 `README.md`。

---

## 1.【你來做】把專案放進 git 並共享

解壓後先確認能跑，再推上 GitHub（建議私有），每個隊員各自 clone。

```bash
cd ootd
npm install && npm run dev      # 確認跑得起來（http://localhost:5173）
git init && git add . && git commit -m "init: OOTD Phase 0 scaffold"
# 在 GitHub 建立 repo 後：
git remote add origin <你的repo網址>
git push -u origin main
```

`.gitignore` 已設好（不會 commit `node_modules`/`dist`）。**`CLAUDE.md` 一定要 commit** —— 這樣每位隊員的 Claude Code 都會自動套同一套規矩。

---

## 2.【你來做】安裝 Claude Code

需要付費的 Claude 方案（免費版不含 Claude Code；Claude Pro 約月費 $20 即涵蓋終端機與網頁版）。需 **Node.js 18 以上**。

```bash
# npm（最通用）
npm install -g @anthropic-ai/claude-code

# 或原生安裝（擇一）
# macOS / Linux / WSL:   curl -fsSL https://claude.ai/install.sh | bash
# Homebrew:              brew install --cask claude-code
# Windows PowerShell:    irm https://claude.ai/install.ps1 | iex
```

不想用終端機的隊員可改用 **Claude Code 桌面版**。安裝後 `cd` 進 repo 根目錄，輸入 `claude`，第一次會提示 `/login` 登入帳號。

---

## 3. 協作模式：一人一分支、一人一插槽

骨架刻意把功能工作隔離在各自的 `src/screens/` 檔，所以多人平行開發很少撞車。每位隊員：

```bash
git checkout -b feat/weather    # 自己的功能分支（名稱換成你的插槽）
claude                          # 在 repo 根目錄開 Claude Code
```

做完 → commit → 開 PR → review → 合併。

**唯一要小心的是共用檔**：`src/db/db.ts` 的資料表、被多人共用的 `src/engines/`、`src/index.css` 的 token。這些建議指定一位「基礎建設負責人」統一改，或改前先在群組喊一聲。資料表要加欄位時，用 Dexie 升版（`this.version(2).stores({...})`），不要直接改舊版。

---

## 4. 任務指派：怎麼對 Claude Code 下 prompt

Claude Code 會自動讀 `CLAUDE.md`、`README.md`、`docs/` 與實際程式碼，所以 prompt 只要**指名插槽 + 指向契約檔 + 說明要接到哪**即可。

**通用模板：**

```
請實作【某區塊】。
- 規格看 docs/，契約看 src/engines/xxx.ts 或對應的 src/screens/xxx.tsx
- 嚴格照 CLAUDE.md 的慣例（資料走 db.*、用設計 token、五行用 engines/wuxing.ts）
- 完成後接進【某頁面】
- 用 npm run dev 自測，並確認 npm run build 零型別錯誤
```

**範例 A — 天氣引擎：**

> 請實作天氣引擎。把 `src/engines/weather.ts` 的 `getCurrentWeather` 改成接中央氣象署 CWA 開放資料 API（我會提供 key），用 `getCoords()` 取得定位後查當地今日溫度/降雨/體感，並讓 `src/screens/Home.tsx` 的天氣列顯示真資料。`WeatherInfo` 介面不要動，照 CLAUDE.md 慣例，完成後 `npm run dev` 自測。

**範例 B — 穿搭組合建立：**

> 請實作 `src/screens/OutfitBuilder.tsx`：從 `db.items` 多選單品 → 命名 → 標主導五行與適合季節 → 存成 `db.outfits`，可參考 `src/screens/AddItem.tsx` 的選取與儲存寫法。完成後讓 `src/screens/Outfits.tsx` 列出已存穿搭，點進可看單品與五行。

**範例 C — 個人中心統計：**

> 請實作 `src/screens/Profile.tsx` 的穿著統計：用 `db.items` 與 `engines/recommend.ts` 的 `cpw` 算出本月穿著次數、最常穿、總支出、各類別比例（Closet Distribution）、Colors by Category。先做純前端統計，UI 用設計 token。

> 提醒：Claude Code 預設在每次寫檔或執行指令前會先請你確認（Ask 模式），看清楚再批准；熟悉後可開放部分自動權限加快速度。

---

## 5. 建議的開工順序

1. 照 `README.md` 的分工表，每人認領一個插槽，並在 `CLAUDE.md` 的「功能插槽負責人」填上名字（commit）。
2. 先讓一兩位把**已經能跑的迴圈**延伸出去（衣櫥編輯、穿搭組合）——風險低、馬上有成果。
3. 其他人並行接相對獨立的插槽：天氣引擎、個人中心統計、IG 匯出。
4. 首頁負責人最後整合（開運穿搭卡細化、穿搭詳情 Sheet）——因為它依賴前面幾塊的產出。

---

## 6. 重要規則摘要（給 Claude Code 與所有人）

1. 資料一律走 `db.*`（`src/db/db.ts`）；圖片用 `src/db/images.ts`。**禁用 localStorage。**
2. 共用邏輯放 `src/engines/`，功能畫面放 `src/screens/`；主要改自己負責的 screen 檔。
3. 顏色用設計 token / 語意 class（`bg-seal`、`text-ink`、五行色 `text-wood/fire/earth/metal/water`），**不要硬寫 hex**。
4. 五行唯一來源是 `src/engines/wuxing.ts`；命理為簡化模型，凡顯示喜忌處 UI 必須標「僅供參考」。
5. **不要把 HashRouter 改成 BrowserRouter**（會讓 GitHub Pages 404）。
6. 改完跑 `npm run build` 確認零型別錯誤；不要 commit `node_modules`/`dist`。

完整慣例見 `CLAUDE.md`，產品全貌見 `docs/OOTD_開發計劃書_v2.md` 與 `docs/OOTD_Phase0_實作規格.md`。
