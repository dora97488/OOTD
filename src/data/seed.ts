// Demo 種子資料 —— 把衣櫥原型的 30 件單品（圖在 public/seed/）寫進 IndexedDB，
// 讓衣櫥一打開就有東西可展示。以穩定 id 補齊（top-up）：缺哪件補哪件、可重複執行不重複。
//
// 去背規範：衣櫥的 Sticker 靠「透明通道」抓衣物輪廓，所以每張入庫圖都必須是去背透明圖。
// 原型那批 .png 已是去背圖；2026.6.6 後補的 .jpg 是原始照片（有背景）→ 入庫前一律走
// 專案 removeBackground（與拍照／電商連結新增的照片同一支引擎、同規範）轉成去背圖。
// 已經以原始照片 seed 過的舊資料，會在這裡偵測「無透明通道」並自動補去背、換掉舊圖（冪等）。
// ⚠️ 純展示用：日後接後端 / 正式上線可移除此檔與 Closet 內的呼叫。
import type { Item, Category, Season, WuXing } from '../db/db';
import { addItem, getItem, updateItem } from './items';
import { storeImage, getImageBlob, deleteImage } from '../db/images';
import { removeBackground } from '../engines/bgRemove';
import { colorToWuxing } from '../engines/wuxing';

interface SeedSpec {
  name: string;
  cat: Category;
  season: Season;
  wuxing: WuXing;
  color: string;
  file: string;
  worn: number;
  price: number;
  brand: string;
}

const SEED: SeedSpec[] = [
  { name: '淺藍條紋襯衫',     cat: '上衣', season: '春夏', wuxing: '水', color: '#aecbe8', file: 'blue-shirt.png',  worn: 12, price: 1290, brand: 'Uniqlo' },
  { name: '卡其針織背心',     cat: '上衣', season: '春秋', wuxing: '土', color: '#b8a890', file: 'shirt-knit.png',  worn: 8,  price: 1680, brand: '& Other Stories' },
  { name: '淺灰棉質長袖上衣', cat: '上衣', season: '四季', wuxing: '金', color: '#d6d8da', file: 'shirt-3.png',     worn: 15, price: 990,  brand: 'COS' },
  { name: '灰綠荷葉細肩上衣', cat: '上衣', season: '夏',   wuxing: '木', color: '#a8b5a0', file: 'shirt-4.png',     worn: 3,  price: 1350, brand: 'ZARA' },
  { name: '淺藍寬版西裝褲',   cat: '下身', season: '春夏', wuxing: '水', color: '#aecbe2', file: 'pants-3.png',     worn: 10, price: 1580, brand: 'Mango' },
  { name: '淺色寬版牛仔褲',   cat: '下身', season: '四季', wuxing: '水', color: '#bcd0e4', file: 'pants-2.png',     worn: 28, price: 1980, brand: "Levi's" },
  { name: '靛藍直筒長褲',     cat: '下身', season: '四季', wuxing: '水', color: '#6b7c9c', file: 'pants-1.png',     worn: 5,  price: 1690, brand: 'NET' },
  { name: '卡其寬褲',         cat: '下身', season: '春秋', wuxing: '土', color: '#8a7a5e', file: 'pants-brown.png', worn: 6,  price: 1280, brand: 'GU' },
  { name: '黑色棉質長裙',     cat: '下身', season: '四季', wuxing: '水', color: '#2a2a2a', file: 'skirt-1.png',     worn: 22, price: 1480, brand: 'NET' },
  { name: '白色無袖層次洋裝', cat: '洋裝', season: '夏',   wuxing: '金', color: '#ece7da', file: 'dress-1.png',     worn: 3,  price: 2100, brand: 'ZARA' },
  { name: '藍色細肩帶長洋裝', cat: '洋裝', season: '夏',   wuxing: '水', color: '#5a7fa8', file: 'dress-2.png',     worn: 7,  price: 1890, brand: 'Mango' },
  { name: '水藍無袖長洋裝',   cat: '洋裝', season: '夏',   wuxing: '水', color: '#c8e4e8', file: 'dress-3.png',     worn: 2,  price: 2480, brand: 'COS' },
  { name: '鵝黃襯衫洋裝',     cat: '洋裝', season: '春夏', wuxing: '土', color: '#f0e6b8', file: 'dress-4.png',     worn: 9,  price: 1990, brand: 'Uniqlo' },
  // —— 2026.6.6 補充單品 ——
  { name: '藍白條紋針織Polo', cat: '上衣', season: '春秋', wuxing: '水', color: '#3a6ea5', file: 'top-polo-blue-stripe.jpg', worn: 6,  price: 1480, brand: 'ZARA' },
  { name: '紅藍寬條紋Polo衫', cat: '上衣', season: '春秋', wuxing: '火', color: '#d6433a', file: 'top-polo-red-stripe.jpg',  worn: 4,  price: 1580, brand: 'Mango' },
  { name: '咖啡喇叭袖上衣',   cat: '上衣', season: '春秋', wuxing: '土', color: '#5a4332', file: 'top-brown-flare.jpg',     worn: 5,  price: 1290, brand: 'ZARA' },
  { name: '咖啡短袖針織上衣', cat: '上衣', season: '春秋', wuxing: '土', color: '#6b5640', file: 'top-brown-knit.jpg',      worn: 7,  price: 1680, brand: '& Other Stories' },
  { name: '淺藍丹寧短版襯衫', cat: '上衣', season: '春夏', wuxing: '水', color: '#a8c4dc', file: 'top-denim-crop.jpg',      worn: 3,  price: 1380, brand: 'GU' },
  { name: '粉紅落肩寬版上衣', cat: '上衣', season: '夏',   wuxing: '火', color: '#f4a8c8', file: 'top-pink-vneck.jpg',      worn: 8,  price: 990,  brand: 'Uniqlo' },
  { name: '珊瑚紅短袖Polo衫', cat: '上衣', season: '春夏', wuxing: '火', color: '#d6504a', file: 'top-polo-coral.jpg',      worn: 4,  price: 1280, brand: 'COS' },
  { name: '米白滾邊短袖外套', cat: '外套', season: '春秋', wuxing: '金', color: '#ece7da', file: 'jacket-cream-tweed.jpg',  worn: 2,  price: 2680, brand: 'Maje' },
  { name: '淺藍亞麻寬褲',     cat: '下身', season: '春夏', wuxing: '水', color: '#aecbe8', file: 'pants-blue-linen.jpg',    worn: 9,  price: 1490, brand: 'Mango' },
  { name: '粉彩印花寬褲',     cat: '下身', season: '夏',   wuxing: '火', color: '#e8c4b8', file: 'pants-pastel-print.jpg',  worn: 3,  price: 1690, brand: 'ZARA' },
  { name: '焦糖綁帶寬褲',     cat: '下身', season: '春秋', wuxing: '土', color: '#a86a4e', file: 'pants-caramel-wrap.jpg',  worn: 5,  price: 1580, brand: 'COS' },
  { name: '黑色太陽眼鏡',     cat: '配件', season: '四季', wuxing: '水', color: '#1a1a1a', file: 'acc-sunglasses.jpg',     worn: 14, price: 2200, brand: 'Gentle Monster' },
  { name: '黑色皮革側背包',   cat: '配件', season: '四季', wuxing: '水', color: '#1a1a1a', file: 'acc-bag-black.jpg',       worn: 20, price: 3200, brand: 'Charles & Keith' },
  { name: '米白托特包',       cat: '配件', season: '四季', wuxing: '土', color: '#e8e2d4', file: 'acc-bag-cream.jpg',       worn: 16, price: 2980, brand: 'COS' },
  { name: '焦糖皮革手提包',   cat: '配件', season: '四季', wuxing: '土', color: '#a06a3c', file: 'acc-bag-caramel.jpg',     worn: 11, price: 2680, brand: 'Massimo Dutti' },
  { name: '草編托特包',       cat: '配件', season: '夏',   wuxing: '土', color: '#c8a878', file: 'acc-bag-straw.jpg',       worn: 6,  price: 1280, brand: 'NET' },
  { name: '藍白條紋肩背包',   cat: '配件', season: '夏',   wuxing: '水', color: '#2a3f6a', file: 'acc-bag-stripe.jpg',      worn: 4,  price: 1980, brand: 'ZARA' },
];

const seedId = (file: string) => `seed-${file.replace(/\.[^.]+$/, '')}`;
// 原始照片（有背景，需去背）；.png 視為原型已去背圖。
const isRawPhoto = (file: string) => /\.jpe?g$/i.test(file);

// 示範資料的固定上傳時間基準（2024-01-01，過去時點）：seed 依陣列順序給升冪 createdAt，
// 讓 demo 30 件保持原型排序、且永遠早於使用者真實上傳（Date.now()）。衣櫥依 createdAt 升冪 = 上傳順序。
const SEED_EPOCH = 1704067200000;
const seedCreatedAt = (i: number) => SEED_EPOCH + i * 1000;

// 偵測 blob 是否已是「去背透明圖」：縮樣後取 alpha，有一定比例透明像素即視為已去背。
async function hasTransparency(blob: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(blob);
    const w = Math.min(bmp.width, 64);
    const h = Math.min(bmp.height, 64);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 200) transparent++;
    return transparent > w * h * 0.04; // 去背圖邊角會有大量透明像素
  } catch {
    return true; // 解碼失敗就當作已處理，避免誤觸去背
  }
}

// 去背（同其他照片規範）；失敗保底回原圖，不擋整批 seed。
async function toCutout(blob: Blob): Promise<Blob> {
  try {
    return await removeBackground(blob);
  } catch (e) {
    console.error('[seed] 去背失敗，暫用原圖：', e);
    return blob;
  }
}

// 去重複：同一次 page load 內無論被呼叫幾次（含 React StrictMode effect 雙跑、多個 Closet 掛載）
// 都共用同一個 promise，避免並發造成重複寫入。
let inflight: Promise<number> | null = null;

/**
 * 補齊示範 30 件（含圖片）：以穩定 `seedId` 逐件 top-up，缺哪件補哪件、可重複執行不重複。
 * 只新增「目前不存在」的示範單品，不覆蓋／不動使用者自己加的或已修改的單品。回傳新增件數。
 */
export function seedClosetIfEmpty(): Promise<number> {
  if (!inflight) inflight = doSeed();
  return inflight;
}

async function doSeed(): Promise<number> {
  let added = 0;

  for (let i = 0; i < SEED.length; i++) {
    const s = SEED[i];
    const id = seedId(s.file);
    try {
      const existing = await getItem(id);
      if (existing) {
        // 正規化上傳順序：把示範單品的 createdAt 對齊固定升冪基準（冪等），
        // 確保衣櫥「demo 在前、依陣列順序、且早於使用者上傳」。
        const wantCreatedAt = seedCreatedAt(i);
        if (existing.createdAt !== wantCreatedAt) await updateItem(id, { createdAt: wantCreatedAt });
        // 修復「用原始照片 seed 過、還沒去背」的舊資料（冪等：已去背就跳過）。
        if (isRawPhoto(s.file)) {
          const current = await getImageBlob(existing.imageId);
          if (current && !(await hasTransparency(current))) {
            const cutId = await storeImage(await toCutout(current));
            await updateItem(id, { imageId: cutId });
            await deleteImage(existing.imageId);
            added++; // 計入「本次處理的件數」
          }
        }
        continue;                                 // 不覆蓋使用者保留／已修改的單品
      }
      const res = await fetch(`${import.meta.env.BASE_URL}seed/${s.file}`);
      if (!res.ok) continue;
      // 原始照片（jpg）→ 入庫前去背成透明圖；原型 png 已去背直接存。
      const raw = await res.blob();
      const imageId = await storeImage(isRawPhoto(s.file) ? await toCutout(raw) : raw);
      const item: Item = {
        id,
        name: s.name,
        imageId,
        category: s.cat,
        mainColorHex: s.color,
        colorName: colorToWuxing(s.color).colorName,
        wuxing: s.wuxing,
        season: s.season,
        brand: s.brand,
        price: s.price,
        tags: [],
        wearCount: s.worn,
        createdAt: seedCreatedAt(i),              // 升冪 = 上傳順序（陣列前者在前）
      };
      await addItem(item);
      added++;
    } catch {
      // 單件失敗就跳過，不擋整批
    }
  }
  return added;
}
