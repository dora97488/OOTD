# Editorial Vibe App Design System

> **OOTD 設計規範（單一來源）。** 做任何畫面前先看這份。W3C 格式 token 原始檔見 [`design-tokens.json`](./design-tokens.json)。

---

## 🧩 在 OOTD 怎麼用（整合說明 —— 工程師看這段）

這些 token **已接進程式碼**（`src/index.css` 的 CSS 變數 + `tailwind.config.js`）。**請用 Tailwind 語意 class，不要硬寫 hex。**

| 用途 | Tailwind class | token |
|---|---|---|
| 主背景（暖紙） | `bg-paper` | `#F7F6F2` |
| 柔灰底 / 低對比 | `bg-canvas`、`bg-bg-muted` | `#F1F0EC`、`#E8E6E1` |
| 白卡 / 編輯面板 | `bg-card`、`bg-surface` | `#FFFFFF`、`#FBFAF7` |
| 主文字 / 次要 / 極淡 | `text-ink`、`text-muted`、`text-faint` | `#1E1E1C`、`#6F6B64`、`#B7B4AD` |
| 分隔線 | `border-line`、`border-line-soft` | `#ECE9E3`、`#DEDAD2` |
| **主 CTA（terracotta）** | `bg-terracotta` / `active:bg-terracotta-dark`、字用 `text-inverse` | `#A94D28` / `#8F3E20` |
| 點綴（少量） | `text-tomato`/`leaf`/`cream`/`navy`/`gold` | 見下方 |
| 圓角 | `rounded-card`(22px)、`rounded-panel`(26px)、`rounded-pill` | — |
| 陰影（極淡） | `shadow-card` | `0 1px 2px rgba(30,30,28,.04)` |
| 字體 | `font-serif`（標題/數字/tab/CTA）、預設 sans（功能性內容） | 見下方 |

**字體：** 襯線 = Cormorant Garamond（拉丁）＋ Noto Serif TC / 宋體（中文 fallback）；無襯線 = Inter ＋ Noto Sans TC / PingFang TC。
中文標題會落在思源宋體/宋體（襯線感由它承擔），拉丁字與數字才是 Cormorant Garamond 的編輯感。

**五行功能色（OOTD 特有，不在原 token 表內）：** 每件衣物的五行屬性顯示色 —— `text-wood/fire/earth/metal/water` 與 `WUXING_HEX`（`src/constants/colors.ts`）。已和諧本系統點綴色：木=葉綠、火=番茄、土=金、金=暖銀灰、水=深藍。
> ⚠️ 別跟 `src/constants/colors.ts` 的 `COLOR_ANCHORS` 搞混 —— 那是「照片主色→五行」的分類錨點，不是顯示色。

**相容性：** 舊的 `bg-seal` 仍可用，等同 `bg-terracotta`（同色）。新程式碼建議用 `terracotta`。

**字體載入：** 目前用 Google Fonts `<link>`（`index.html`）；離線 / 上 App Store 前建議改為自架字體（如 `@fontsource`）。

---

## Style Summary

This interface style is an editorial lifestyle app system built around warm paper textures, refined serif typography, soft white cards, handmade collage imagery, and terracotta circular calls to action. It should feel less like a conventional utility app and more like an interactive fashion or lifestyle magazine.

The mood is quiet, curated, feminine, tactile, and art-directed. Layouts rely on generous whitespace, soft contrast, and carefully placed image fragments rather than heavy borders, strong shadows, or dense controls.

## Visual Keywords

- Editorial magazine
- Warm paper
- Lifestyle collage
- French minimal
- Soft luxury
- Handmade moodboard
- Fashion journal
- Plant-based lifestyle
- Gentle curation

## Color Direction

Use warm whites and soft grays as the base. The interface should feel like content placed on paper, not on a bright digital canvas.

Primary background colors:

- Warm paper white: `#F7F6F2`
- Soft canvas gray: `#F1F0EC`
- Muted neutral: `#E8E6E1`

Text colors:

- Primary text: `#1E1E1C`
- Secondary text: `#6F6B64`
- Muted text: `#B7B4AD`

Accent colors:

- Terracotta CTA: `#A94D28`
- Dark terracotta pressed state: `#8F3E20`
- Tomato red: `#D84A2B`
- Leaf green: `#8FA66B`
- Cream: `#EFE7C9`
- Deep navy: `#202638`
- Soft gold: `#C5A24B`

The accent color should be used sparingly. Terracotta is reserved for the most important actions such as Join or Save.

## Typography

Typography is one of the strongest parts of this system. Use a high-contrast serif for editorial hierarchy and a clean sans-serif for functional content.

Recommended serif fonts:

- Cormorant Garamond
- Didot
- Bodoni 72
- Libre Baskerville

Recommended sans-serif fonts:

- Inter
- Helvetica Neue
- Neue Haas Grotesk

Use serif type for:

- Large section tabs
- Page titles
- Metadata labels
- Statistics
- CTA text
- Navigation text

Use sans-serif type for:

- Card headlines
- Functional labels
- Compact article titles
- Interface details that need clarity

Large editorial titles may use uppercase with tight line height. Avoid negative letter spacing. Keep letter spacing neutral.

## Layout Principles

The layout should feel like a magazine page composed inside a mobile screen.

Core layout rules:

- Use generous top whitespace.
- Place the main content rhythmically in the lower half of the screen.
- Allow horizontal tabs to softly crop at screen edges.
- Prefer mosaic card compositions over rigid dashboard grids.
- Let imagery and typography create hierarchy before adding controls.
- Avoid dense toolbars, obvious app chrome, and heavy navigation structures.

The interface should feel calm even when multiple pieces of content are visible.

## Components

### Cards

Cards are soft white editorial containers.

Card style:

- White or warm-white background
- Large radius around `22px`
- Minimal or no shadow
- Very subtle border if needed
- Content arranged like print layout

Cards should not feel like heavy material design surfaces. They should feel like paper blocks layered on a page.

### Primary CTA

The primary action is a terracotta circular button.

CTA style:

- Circle shape
- Terracotta background
- White serif text
- Minimal decoration
- Large enough to feel intentional

Common CTA labels:

- Join
- Save

Use only one primary CTA per screen or visual cluster.

### Tabs

Tabs are large serif words arranged horizontally.

Tab behavior:

- Active tab uses near-black text.
- Inactive tabs use pale gray text.
- Tabs may overflow horizontally.
- Edge cropping is acceptable and part of the visual language.

Example tabs:

- Clubs
- Findings
- Activities
- Info
- Vibe Check
- Keywords

### Metadata

Metadata should be quiet and delicate.

Use small serif text, often italic or light gray, for:

- Recently Posted
- About
- Author
- Published
- Created
- Article of the Month

Metadata is decorative but still informative. It should never overpower the main content.

### Statistics

Statistics appear in soft rounded white cards.

Structure:

- Small muted label on top
- Large serif number below
- Centered alignment
- Three-column layout when possible

The number should feel editorial, not analytical.

## Imagery

Imagery should carry the emotional identity of the product.

Preferred image styles:

- Hand-drawn illustrations
- Vegetable or lifestyle sketches
- Cutout fashion products
- Lifestyle photography
- Watercolor, colored-pencil, or print texture
- Moodboard-style floating objects

Avoid:

- Generic stock imagery
- Heavy dark overlays
- Tech-style gradients
- Glossy ecommerce card treatments
- Overly polished 3D renders

Images should feel physically placed on paper. Leave space around them.

> **OOTD 註：** 衣物去背圖天生就是「cutout fashion products / floating objects」，放在 `bg-paper` 上、留白、極淡陰影，正好就是這個系統要的 moodboard 感。

## Interaction Feel

Interactions should feel soft and editorial.

Recommended motion:

- Horizontal tab movement: `280ms ease-out`
- Card press: `120ms ease-out`
- CTA press scale: `0.97`

Avoid bouncy or highly playful motion. The experience should feel composed and tactile.

## Design Do

- Use warm white backgrounds.
- Use serif type generously.
- Keep navigation quiet.
- Use terracotta only for important actions.
- Create layouts that feel curated rather than system-generated.
- Use real collage, illustration, or product imagery.
- Let some horizontal text extend beyond the viewport.

## Design Don't

- Do not use saturated digital backgrounds.
- Do not overuse cards within cards.
- Do not rely on strong shadows.
- Do not use too many icons.
- Do not make the interface feel like a SaaS dashboard.
- Do not use generic purple or blue gradient styling.
- Do not fill every space; whitespace is part of the identity.

## One-Line Direction

Build the app as a warm editorial lifestyle magazine: paper-like surfaces, elegant serif typography, soft white content blocks, hand-placed collage imagery, and restrained terracotta circular actions.
