// 商品連結解析引擎 —— 貼上購物網址 → 抓出品名 / 品牌 / 價格 / 商品圖。
//
// ⚠️ Hackathon 直連模式：瀏覽器直接 fetch 外站會被 CORS 擋，故透過公開 CORS proxy
//    抓 HTML / 圖片。proxy 為第三方服務、僅限本機 demo；上線時應改走自家後端代抓。
//    （同 itemPhoto.ts 的收斂原則：之後接後端只改這支引擎，呼叫端不動。）
//
// 解析策略：優先讀 JSON-LD（schema.org Product），其次 Open Graph / meta 標籤。
//    多數電商（UNIQLO / ZARA / 蝦皮…）會在初始 HTML 內附 OG 標籤供分享預覽，足夠 demo。
import type { Category } from '../db/db';

export interface ProductMeta {
  name?: string;
  brand?: string;
  price?: number;
  imageUrl?: string;
  category?: Category;
  siteName?: string;
}

// 依序嘗試的 CORS proxy（前者失敗自動換下一個）。{url} 會被替換成 encode 後的目標網址。
const PROXIES = [
  'https://api.allorigins.win/raw?url={url}',
  'https://corsproxy.io/?url={url}',
];

export function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function fetchViaProxy(target: string): Promise<Response> {
  let lastErr: unknown;
  for (const tpl of PROXIES) {
    try {
      const proxied = tpl.replace('{url}', encodeURIComponent(target));
      const res = await fetch(proxied);
      if (res.ok) return res;
      lastErr = new Error(`proxy ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`無法抓取連結內容：${lastErr instanceof Error ? lastErr.message : 'unknown'}`);
}

/**
 * 解析商品連結，回傳可帶入表單的中繼資料。
 * @param rawUrl 使用者貼上的購物網址
 * @throws 網址無效 / 連線失敗時拋錯，呼叫端可顯示 toast 並停留在輸入頁
 */
export async function parseProductLink(rawUrl: string): Promise<ProductMeta> {
  const url = rawUrl.trim();
  if (!isValidUrl(url)) throw new Error('請貼上有效的商品網址（http/https）');

  const res = await fetchViaProxy(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const meta: ProductMeta = {};
  applyJsonLd(doc, meta);   // 先吃結構化資料（最準）
  applyMetaTags(doc, meta); // 再用 OG / meta 補空缺

  // 圖片網址轉成絕對路徑（OG 多為絕對，但保險起見）
  if (meta.imageUrl) {
    try { meta.imageUrl = new URL(meta.imageUrl, url).href; } catch { /* 保留原值 */ }
  }
  // 品名 fallback 用 <title>：但 <title> 常是頁面外框（如「商品明細 - UNIQLO台灣」），不是商品名。
  // 只有在頁面其實有結構化商品訊號（圖片/價格/品牌）時才採用；否則留空讓使用者自己填。
  if (!meta.name && (meta.imageUrl || meta.brand || meta.price !== undefined)) {
    meta.name = doc.querySelector('title')?.textContent?.trim() || undefined;
  }
  // 品牌 fallback 用站名
  if (!meta.brand && meta.siteName) meta.brand = meta.siteName;

  meta.name = meta.name ? cleanText(meta.name) : undefined;
  meta.brand = meta.brand ? cleanText(meta.brand) : undefined;

  // proxy 也被擋時會回傳封鎖/錯誤頁，別把它的標題當商品名 → 留空讓使用者填。
  if (meta.name && BLOCK_PAGE_RE.test(meta.name)) meta.name = undefined;
  if (meta.brand && BLOCK_PAGE_RE.test(meta.brand)) meta.brand = undefined;

  meta.category = guessCategory(`${meta.name ?? ''} ${meta.siteName ?? ''}`);

  return meta;
}

// 常見的封鎖/錯誤頁標題（反爬蟲、CDN 擋頁），這些不是商品資訊。
const BLOCK_PAGE_RE = /access denied|forbidden|just a moment|attention required|verify you are human|are you a robot|captcha|\b40[0-9]\b|\b50[0-9]\b|not found|error|站台|拒絕存取|頁面不存在/i;

/** 透過 proxy 把商品圖抓成 blob（供去背 / 取色 / 建檔）。失敗回傳 undefined。 */
export async function fetchProductImage(imageUrl: string): Promise<Blob | undefined> {
  try {
    const res = await fetchViaProxy(imageUrl);
    const blob = await res.blob();
    if (blob.type.startsWith('image/') && blob.size > 0) return blob;
  } catch (e) {
    console.error('商品圖抓取失敗', e);
  }
  return undefined;
}

// ---- 解析：JSON-LD（schema.org Product）----
function applyJsonLd(doc: Document, meta: ProductMeta) {
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const s of scripts) {
    let parsed: unknown;
    try { parsed = JSON.parse(s.textContent || ''); } catch { continue; }
    // 可能是陣列、或含 @graph
    const nodes = flattenLd(parsed);
    const product = nodes.find((n) => matchesType(n, 'Product'));
    if (!product) continue;

    if (!meta.name && typeof product.name === 'string') meta.name = product.name;
    const brand = product.brand;
    if (!meta.brand) {
      if (typeof brand === 'string') meta.brand = brand;
      else if (brand && typeof brand === 'object' && typeof (brand as any).name === 'string') meta.brand = (brand as any).name;
    }
    if (!meta.imageUrl) {
      const img = product.image;
      if (typeof img === 'string') meta.imageUrl = img;
      else if (Array.isArray(img) && typeof img[0] === 'string') meta.imageUrl = img[0];
      else if (img && typeof (img as any).url === 'string') meta.imageUrl = (img as any).url;
    }
    if (meta.price === undefined) {
      const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      const p = offers && typeof offers === 'object' ? (offers as any).price ?? (offers as any).lowPrice : undefined;
      const num = toPrice(p);
      if (num !== undefined) meta.price = num;
    }
    if (meta.name && meta.imageUrl && meta.price !== undefined) break;
  }
}

function flattenLd(parsed: unknown): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node && typeof node === 'object') {
      const obj = node as Record<string, any>;
      out.push(obj);
      if (Array.isArray(obj['@graph'])) obj['@graph'].forEach(visit);
    }
  };
  visit(parsed);
  return out;
}

function matchesType(node: Record<string, any>, type: string): boolean {
  const t = node['@type'];
  if (typeof t === 'string') return t === type;
  if (Array.isArray(t)) return t.includes(type);
  return false;
}

// ---- 解析：Open Graph / meta 標籤 ----
function applyMetaTags(doc: Document, meta: ProductMeta) {
  const get = (selectors: string[]): string | undefined => {
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      const content = el?.getAttribute('content')?.trim();
      if (content) return content;
    }
    return undefined;
  };

  if (!meta.name) meta.name = get(['meta[property="og:title"]', 'meta[name="twitter:title"]']);
  if (!meta.imageUrl) meta.imageUrl = get(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:url"]']);
  if (!meta.siteName) meta.siteName = get(['meta[property="og:site_name"]']);
  if (!meta.brand) meta.brand = get(['meta[property="product:brand"]', 'meta[property="og:brand"]']);
  if (meta.price === undefined) {
    const p = get([
      'meta[property="product:price:amount"]',
      'meta[property="og:price:amount"]',
      'meta[name="twitter:data1"]',
    ]);
    const num = toPrice(p);
    if (num !== undefined) meta.price = num;
  }
}

// ---- 小工具 ----
function toPrice(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const digits = String(v).replace(/[^\d.]/g, '');
  if (!digits) return undefined;
  const n = Math.round(Number(digits));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, 60);
}

// 從品名 / 站名關鍵字粗略猜分類（猜不到回 undefined，呼叫端可用預設值）。
const CATEGORY_KEYWORDS: Array<[Category, RegExp]> = [
  ['洋裝', /(洋裝|連身裙|連衣裙|dress|jumpsuit|連身)/i],
  ['外套', /(外套|大衣|風衣|夾克|羽絨|jacket|coat|blazer|cardigan|針織外套|hoodie|帽t|帽T)/i],
  ['鞋', /(鞋|靴|涼鞋|拖鞋|sneaker|shoe|boot|loafer|heel|sandal)/i],
  ['配件', /(包|帽|圍巾|手套|皮帶|腰帶|襪|耳環|項鍊|戒指|墨鏡|手錶|配件|bag|hat|scarf|belt|sock|accessor)/i],
  ['下身', /(褲|裙|短褲|長褲|牛仔褲|丹寧褲|pants|trouser|jeans|skirt|shorts|legging)/i],
  ['上衣', /(上衣|襯衫|t恤|tee|t-shirt|polo|背心|毛衣|針織|衛衣|shirt|top|sweater|knit|blouse)/i],
];

function guessCategory(text: string): Category | undefined {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return cat;
  }
  return undefined;
}
