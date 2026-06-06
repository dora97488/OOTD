// 主色抽取：對「去背後」的圖只取非透明像素，避免抽到背景。
export async function dominantColor(blob: Blob): Promise<string> {
  try {
    const bmp = await createImageBitmap(blob);
    const target = 64;
    const scale = Math.min(1, target / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();

    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // 透明 → 視為背景，跳過
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`; // 量化分桶
      const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      cur.n++; cur.r += r; cur.g += g; cur.b += b;
      buckets.set(key, cur);
    }
    if (buckets.size === 0) return '#888888';
    let best = { n: -1, r: 0, g: 0, b: 0 };
    for (const v of buckets.values()) if (v.n > best.n) best = v;
    return rgbToHex(
      Math.round(best.r / best.n),
      Math.round(best.g / best.n),
      Math.round(best.b / best.n)
    );
  } catch {
    return '#888888';
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
