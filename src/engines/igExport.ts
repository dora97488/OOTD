// IG 匯出 —— 用 <canvas> 合成 Story 尺寸（1080×1920）PNG。
// composeProfileCard：個人命盤分享卡（資料全來自 Profile，自足可測）。
// exportOutfitImage：穿搭 flat-lay（供 Home 已記錄狀態日後串接；圖片在本 App 已去背）。
// 匯出後由呼叫端用 navigator.share({ files }) 或下載連結分享。
import { WUXING_HEX } from '../constants/colors';
import type { WuXing } from '../db/db';

const WUXING_ORDER: WuXing[] = ['木', '火', '土', '金', '水'];
const W = 1080;
const H = 1920;

const C = {
  paper: '#F7F6F2',
  ink: '#1E1E1C',
  muted: '#6F6B64',
  faint: '#B7B4AD',
  terracotta: '#A94D28',
  track: '#E8E6E1',
};
const serif = (px: number, weight = '400') => `${weight} ${px}px "Noto Serif TC", "Songti TC", serif`;
const sans = (px: number, weight = '400') => `${weight} ${px}px "Noto Sans TC", system-ui, sans-serif`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 以 cover 方式把圖片畫進指定矩形（多餘部分裁切）。
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.max(w / img.width, h / img.height);
  const dw = img.width * ratio;
  const dh = img.height * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export interface ProfileCardSpec {
  nickname: string;
  avatarUrl?: string;
  dayMasterWuxing?: WuXing;
  favorable: WuXing[];
  wuxingCount?: Record<WuXing, number>;
  sunSignZh?: string;
  dateLabel: string;
}

// 個人命盤分享卡。
export async function composeProfileCard(spec: ProfileCardSpec): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // 眉標
  ctx.textAlign = 'center';
  ctx.fillStyle = C.terracotta;
  ctx.font = sans(30, '600');
  ctx.fillText('✦  OOTD · 我的命盤', W / 2, 180);

  // 頭像（圓形裁切；無圖則暖色底＋暱稱首字）
  const cx = W / 2;
  const cyAvatar = 430;
  const r = 150;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cyAvatar, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  let drewAvatar = false;
  if (spec.avatarUrl) {
    try {
      const img = await loadImage(spec.avatarUrl);
      drawCover(ctx, img, cx - r, cyAvatar - r, 2 * r, 2 * r);
      drewAvatar = true;
    } catch {
      drewAvatar = false;
    }
  }
  if (!drewAvatar) {
    ctx.fillStyle = spec.dayMasterWuxing ? WUXING_HEX[spec.dayMasterWuxing] : C.terracotta;
    ctx.fillRect(cx - r, cyAvatar - r, 2 * r, 2 * r);
    ctx.fillStyle = '#fff';
    ctx.font = serif(130, '500');
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.nickname.slice(0, 1) || '我', cx, cyAvatar + 8);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  // 暱稱
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = serif(74, '600');
  ctx.fillText(spec.nickname || '我', cx, 710);

  // meta：喜用神 · 星座
  const metaParts: string[] = [];
  if (spec.favorable.length) metaParts.push(`喜用神「${spec.favorable.join('、')}」`);
  if (spec.sunSignZh) metaParts.push(spec.sunSignZh);
  if (metaParts.length) {
    ctx.fillStyle = C.muted;
    ctx.font = sans(34);
    ctx.fillText(metaParts.join('   ·   '), cx, 782);
  }

  // 五行分布條
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = sans(34, '600');
  ctx.fillText('五行分布', 96, 940);

  const count = spec.wuxingCount;
  const max = count ? Math.max(1, ...WUXING_ORDER.map((w) => count[w] ?? 0)) : 1;
  const barX = 220;
  const barW = 600;
  const barH = 32;
  WUXING_ORDER.forEach((w, i) => {
    const y = 1000 + i * 112;
    ctx.fillStyle = WUXING_HEX[w];
    ctx.font = serif(50, '600');
    ctx.fillText(w, 110, y + barH - 2);
    ctx.fillStyle = C.track;
    roundRect(ctx, barX, y, barW, barH, barH / 2);
    ctx.fill();
    const n = count?.[w] ?? 0;
    const fw = (n / max) * barW;
    if (fw > 0) {
      ctx.fillStyle = WUXING_HEX[w];
      roundRect(ctx, barX, y, Math.max(fw, barH), barH, barH / 2);
      ctx.fill();
    }
    ctx.fillStyle = C.muted;
    ctx.font = sans(34);
    ctx.fillText(String(n), barX + barW + 28, y + barH - 2);
  });

  // footer
  ctx.fillStyle = C.faint;
  ctx.font = sans(28);
  ctx.textAlign = 'left';
  ctx.fillText(spec.dateLabel, 96, 1810);
  ctx.textAlign = 'right';
  ctx.fillText('命理為簡化模型，僅供參考', W - 96, 1810);

  return canvasToBlob(canvas);
}

export interface OutfitCardOptions {
  dateLabel?: string;
  brandLabel?: string;
  luckyColors?: string[]; // hex 色票
}

// 穿搭 flat-lay（圖片在本 App 已去背）。供 Home「輸出今天穿搭到 IG」日後串接。
export async function exportOutfitImage(
  itemImageUrls: string[],
  opts: OutfitCardOptions = {}
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);

  // 眉標 / 日期
  ctx.textAlign = 'left';
  ctx.fillStyle = C.terracotta;
  ctx.font = sans(30, '600');
  ctx.fillText('✦  OOTD', 96, 150);
  if (opts.dateLabel) {
    ctx.fillStyle = C.faint;
    ctx.font = sans(28);
    ctx.textAlign = 'right';
    ctx.fillText(opts.dateLabel, W - 96, 150);
  }

  // 單品方格（2 欄置中）
  const imgs: HTMLImageElement[] = [];
  for (const url of itemImageUrls) {
    try {
      imgs.push(await loadImage(url));
    } catch {
      /* 略過壞圖 */
    }
  }
  const cols = imgs.length <= 1 ? 1 : 2;
  const gap = 40;
  const gridX = 96;
  const gridTop = 240;
  const cellW = (W - gridX * 2 - gap * (cols - 1)) / cols;
  const cellH = cellW;
  imgs.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridX + col * (cellW + gap);
    const y = gridTop + row * (cellH + gap);
    ctx.save();
    roundRect(ctx, x, y, cellW, cellH, 28);
    ctx.fillStyle = C.track;
    ctx.fill();
    ctx.clip();
    drawCover(ctx, img, x, y, cellW, cellH);
    ctx.restore();
  });

  // 幸運色票
  if (opts.luckyColors?.length) {
    const sw = 60;
    const swGap = 20;
    const totalW = opts.luckyColors.length * sw + (opts.luckyColors.length - 1) * swGap;
    let sx = (W - totalW) / 2;
    const sy = 1700;
    opts.luckyColors.forEach((hex) => {
      ctx.fillStyle = hex;
      roundRect(ctx, sx, sy, sw, sw, 14);
      ctx.fill();
      sx += sw + swGap;
    });
  }

  // 品牌字樣
  if (opts.brandLabel) {
    ctx.fillStyle = C.muted;
    ctx.font = serif(36, '500');
    ctx.textAlign = 'center';
    ctx.fillText(opts.brandLabel, W / 2, 1820);
  }

  return canvasToBlob(canvas);
}
