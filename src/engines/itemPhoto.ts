// 單品商品照引擎 —— 把「穿在身上／去背後的衣物」用 GPT 圖像 edit 轉成電商商品照（透明 PNG）。
//
// ⚠️ Hackathon 直連模式：直接從前端打 OpenAI，API key 走 import.meta.env.VITE_OPENAI_API_KEY。
//    VITE_ 前綴的變數會被打進前端 bundle —— 僅限本機 demo，切勿部署上線、切勿 commit key。
//    上線時應改走後端 / serverless proxy（同 platform 收斂原則）。
//
// 取捨：這是「生成」而非「裁切」，會盡量保留顏色/花色/logo，但被身體遮住的部分由 AI 補繪，
//      不保證與真衣服 100% 一致。詳見討論記錄。
import type { Category } from '../db/db';

const ENDPOINT = 'https://api.openai.com/v1/images/edits';
// 預設用 gpt-image-1；可用 VITE_OPENAI_IMAGE_MODEL 覆寫成 gpt-image-2（2026-04 發布，保色/構圖更穩）。
const MODEL = import.meta.env.VITE_OPENAI_IMAGE_MODEL || 'gpt-image-1';

// 分類 → 英文衣物詞，讓 prompt 精準鎖定要抽出的單品。
const CATEGORY_EN: Record<Category, string> = {
  上衣: 'top / upper-body garment',
  下身: 'bottoms (pants / skirt)',
  外套: 'outerwear jacket / coat',
  洋裝: 'dress',
  鞋: 'pair of shoes',
  配件: 'accessory',
};

export function isItemPhotoAvailable(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

function buildPrompt(category?: Category, colorName?: string, targetDescription?: string): string {
  // 流程內自動執行時通常還沒選分類，預設鎖定「最主要那件衣物」。
  const garment = category ? CATEGORY_EN[category] : 'single most prominent clothing garment';
  const colorHint = colorName ? ` The garment's main color is ${colorName}.` : '';
  const targetHint = targetDescription ? ` Target item details: ${targetDescription}.` : '';
  return [
    `Extract ONLY the ${garment} that the person is wearing in this image.`,
    targetHint,
    `Produce a clean e-commerce product photo of just that single garment:`,
    `laid flat / ghost-mannequin style, centered, front-facing,`,
    `on a fully transparent background — no person, no other clothing, no accessories.`,
    `CRITICAL: preserve the garment's exact color, fabric texture, pattern, prints and logos faithfully — do NOT invent or restyle the design.${colorHint}`,
    `Naturally fill in any parts hidden by the body, arms or other objects, consistent with the visible parts.`,
    `Soft even studio lighting, no harsh shadows.`,
  ].join(' ');
}

/**
 * 把一張衣物照（直接吃原圖即可）轉成商品照透明 PNG。
 * gpt-image-1 background:transparent 會直接輸出去背 PNG，無需另外去背。
 * @param input    來源圖 blob（原圖即可，不必先去背）
 * @param category 衣物分類（選填）；省略時自動鎖定畫面中最主要那件衣物
 * @param colorName 主色名（選填，幫助保色）
 * @returns 商品照透明 PNG blob
 * @throws  未設定 key 或 API 失敗時拋錯，呼叫端可 fallback 回原圖
 */
export async function productizeItemPhoto(
  input: Blob,
  category?: Category,
  colorName?: string,
  targetDescription?: string
): Promise<Blob> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('未設定 VITE_OPENAI_API_KEY，無法生成商品照');
  }

  const ext = input.type.includes('webp') ? 'webp' : input.type.includes('jpeg') ? 'jpg' : 'png';
  const form = new FormData();
  form.append('model', MODEL);
  form.append('image', input, `input.${ext}`);
  form.append('prompt', buildPrompt(category, colorName, targetDescription));
  form.append('background', 'transparent'); // gpt-image-1 / gpt-image-2 皆支援透明背景輸出
  form.append('size', '1024x1536'); // 直幅，適合衣物
  form.append('quality', 'medium'); // demo 用中品質，兼顧速度與費用
  form.append('n', '1');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI 圖像 API 失敗 (${res.status})：${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI 回傳缺少影像資料');

  return base64ToBlob(b64, 'image/png');
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export interface StickerOptions {
  border?: number; // 白邊粗細 px
  shadowBlur?: number; // 投影模糊 px
  shadowOffsetY?: number; // 投影下移 px
  shadowAlpha?: number; // 投影濃度 0~1
}

/**
 * 把透明去背圖加工成「白邊 + 柔和投影」的貼紙效果（純 canvas，不打 API）。
 * 做法：① 取去背圖的 alpha 輪廓做成白色剪影 ② 環狀偏移多次蓋白 → 形成均勻白描邊
 *      ③ 描邊層投下柔和陰影 ④ 原圖疊在最上層。輸出透明 PNG，疊在任何底色上都像貼紙。
 * @param input 透明背景的去背 PNG/webp（GPT 或 WASM 去背結果）
 */
export async function stickerize(input: Blob, opts: StickerOptions = {}): Promise<Blob> {
  const border = opts.border ?? 14;
  const shadowBlur = opts.shadowBlur ?? 18;
  const shadowOffsetY = opts.shadowOffsetY ?? 10;
  const shadowAlpha = opts.shadowAlpha ?? 0.28;

  const bitmap = await createImageBitmap(input);
  const w = bitmap.width;
  const h = bitmap.height;
  const pad = border + shadowBlur + Math.abs(shadowOffsetY) + 8;
  const cw = w + pad * 2;
  const ch = h + pad * 2;

  // 白色剪影（離屏）：畫原圖 → source-in 填白 → 得到去背輪廓的純白版
  const sil = document.createElement('canvas');
  sil.width = cw;
  sil.height = ch;
  const sctx = sil.getContext('2d')!;
  sctx.drawImage(bitmap, pad, pad, w, h);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, cw, ch);

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d')!;

  // ① 柔和投影：用白剪影投一道偏移、模糊的暗影
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${shadowAlpha})`;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  ctx.drawImage(sil, 0, 0);
  ctx.restore();

  // ② 白描邊：把白剪影沿圓周多次偏移堆疊，形成 border px 的均勻白邊
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.drawImage(sil, Math.cos(a) * border, Math.sin(a) * border);
  }
  ctx.drawImage(sil, 0, 0); // 中心補滿

  // ③ 原圖疊最上層
  ctx.drawImage(bitmap, pad, pad, w, h);
  bitmap.close();

  return canvasToBlob(canvas);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob 失敗'))),
      'image/png'
    );
  });
}
