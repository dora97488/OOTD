// 參考實作：把共用引擎（bgRemove / color / wuxing）+ 資料層串起來的最小可用流程。
// 衣櫥負責人可在此擴充：整身穿搭萃取、材質/品牌欄位、批次匯入等。
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { CATEGORIES, SEASONS, type Category, type Season, type WuXing } from '../db/db';
import { addItem, storeImage } from '../data';
import { removeBackground } from '../engines/bgRemove';
import { productizeItemPhoto, isItemPhotoAvailable, stickerize } from '../engines/itemPhoto';
import { detectOutfitItems, isOutfitDetectionAvailable } from '../engines/outfitDetect';
import { parseProductLink, fetchProductImage, isValidUrl } from '../engines/productLink';
import { hasOpenAIKey, getUserOpenAIKey, saveOpenAIKey } from '../engines/openaiKey';
import { dominantColor } from '../engines/color';
import { colorToWuxing } from '../engines/wuxing';
import { WUXING_HEX } from '../constants/colors';

type Stage = 'pick' | 'link' | 'processing' | 'form' | 'itemCamera' | 'outfitCamera' | 'outfitAnalyzing' | 'outfitResult';
type Sheet = 'edit' | 'done' | null;
type DetectedItem = {
  id: string;
  name: string;
  brand: string;
  category: Category;
  colorName: string;
  wuxing: WuXing;
  season: Season;
  price: string;
  x: number;
  y: number;
  productBlob?: Blob;  // review 階段就生成的商品貼紙圖（商品照模型）；存檔沿用，不重算
  productUrl?: string; // productBlob 的 object URL，供 <img> 預覽（reset 時 revoke）
};

const COLOR_OPTIONS: Array<{ name: string; hex: string; wuxing: WuXing }> = [
  { name: '白', hex: '#ffffff', wuxing: '金' },
  { name: '灰', hex: '#bdbdbd', wuxing: '金' },
  { name: '金', hex: '#c5a24b', wuxing: '金' },
  { name: '綠', hex: '#2e7d32', wuxing: '木' },
  { name: '藍', hex: '#1565c0', wuxing: '水' },
  { name: '黑', hex: '#000000', wuxing: '水' },
  { name: '紅', hex: '#d32f2f', wuxing: '火' },
  { name: '紫', hex: '#8e24aa', wuxing: '火' },
  { name: '卡其', hex: '#c3ad7d', wuxing: '土' },
  { name: '米', hex: '#d7ccc8', wuxing: '土' },
  { name: '棕', hex: '#6d4c41', wuxing: '土' },
];

const COLOR_ALIASES: Record<string, string> = {
  米色: '米',
  咖啡: '棕',
  藏青: '藍',
  青綠: '綠',
  橙: '紅',
  粉紅: '紅',
  黃: '金',
  銀: '灰',
};

const MOCK_DETECTED_ITEMS: Array<Omit<DetectedItem, 'id'>> = [
  { name: '網紗長袖上衣', brand: '', category: '上衣', colorName: '白', wuxing: '金', season: '春夏', price: '', x: 50, y: 32 },
  { name: '深藍直筒丹寧褲', brand: '', category: '下身', colorName: '藍', wuxing: '水', season: '四季', price: '', x: 50, y: 60 },
  { name: '白色球鞋', brand: '', category: '鞋', colorName: '白', wuxing: '金', season: '四季', price: '', x: 50, y: 84 },
];

export default function AddItem() {
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>('pick');
  const [progress, setProgress] = useState(0);
  const [procLabel, setProcLabel] = useState('處理中…');
  const [procIndeterminate, setProcIndeterminate] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [processedBlob, setProcessedBlob] = useState<Blob>();
  const [originalBlob, setOriginalBlob] = useState<Blob>();
  const [analysis, setAnalysis] = useState<{ hex: string; colorName: string; wuxing: WuXing }>();
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('上衣');
  const [colorName, setColorName] = useState(COLOR_OPTIONS[0].name);
  const [wuxing, setWuxing] = useState<WuXing>(COLOR_OPTIONS[0].wuxing);
  const [season, setSeason] = useState<Season>('四季');
  const [price, setPrice] = useState('');
  const [toast, setToast] = useState<string>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [outfitPhotoBlob, setOutfitPhotoBlob] = useState<Blob>();
  const [outfitPhotoUrl, setOutfitPhotoUrl] = useState<string>();
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [editingItem, setEditingItem] = useState<DetectedItem>();
  const [doneCount, setDoneCount] = useState(0);
  const [outfitBusyLabel, setOutfitBusyLabel] = useState('辨識中…');
  const [outfitProgress, setOutfitProgress] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyConfigured, setKeyConfigured] = useState(hasOpenAIKey());

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showUnavailable = (message: string) => {
    setToast(message);
  };

  const applyDetectedColor = (detectedName: string, detectedWuxing: WuXing) => {
    const normalized = COLOR_ALIASES[detectedName] ?? detectedName;
    const color =
      COLOR_OPTIONS.find((c) => c.name === normalized) ??
      COLOR_OPTIONS.find((c) => normalized.includes(c.name)) ??
      COLOR_OPTIONS.find((c) => c.wuxing === detectedWuxing) ??
      COLOR_OPTIONS[0];

    setColorName(color.name);
    setWuxing(color.wuxing);
  };

  const updateColor = (nextName: string) => {
    const color = COLOR_OPTIONS.find((c) => c.name === nextName) ?? COLOR_OPTIONS[0];
    setColorName(color.name);
    setWuxing(color.wuxing);
  };

  const startItemFlow = () => {
    setStage('itemCamera');
  };

  const resetOutfitFlow = () => {
    setSheet(null);
    setOutfitPhotoBlob(undefined);
    setOutfitPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return undefined;
    });
    setDetectedItems((items) => {
      items.forEach((it) => { if (it.productUrl) URL.revokeObjectURL(it.productUrl); });
      return [];
    });
    setEditingItem(undefined);
    setDoneCount(0);
    setStage('pick');
  };

  const startOutfitFlow = () => {
    setSheet(null);
    setStage('outfitCamera');
  };

  const analyzeOutfitPhoto = async (file: File) => {
    setSheet(null);
    setOutfitPhotoBlob(file);
    setOutfitPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setOutfitBusyLabel('整套辨識中…');
    setOutfitProgress(0.06);
    setStage('outfitAnalyzing');

    // 1) 辨識：vision 拆出多件單品的文字 metadata（名稱/分類/顏色/座標…），尚無圖片。
    const detectTimer = window.setInterval(() => {
      setOutfitProgress((value) => Math.min(0.24, value + 0.02));
    }, 400);
    let detected: DetectedItem[];
    try {
      if (!isOutfitDetectionAvailable()) {
        throw new Error('未設定 VITE_OPENAI_API_KEY');
      }
      const items = await detectOutfitItems(file);
      detected = items.map((item) => ({ ...item, id: uuid() }));
    } catch (e) {
      console.error(e);
      detected = MOCK_DETECTED_ITEMS.map((item) => ({ ...item, id: uuid() }));
      showUnavailable('整套辨識失敗，已先用 prototype 模擬結果。請於上一頁填入可用的 OpenAI API Key。');
    } finally {
      window.clearInterval(detectTimer);
    }
    setOutfitProgress(0.25);

    // 2) 逐件生成真實商品貼紙圖（商品照模型，從整身照各別萃取）。
    //    沒 key / 生成失敗會在 productizeDetectedItemPhoto 內回退占位 SVG，故 review 一定有圖可顯示。
    const withImages: DetectedItem[] = [];
    for (let i = 0; i < detected.length; i++) {
      const item = detected[i];
      setOutfitBusyLabel(`生成商品圖 ${i + 1}/${detected.length}…`);
      const selectedColor = COLOR_OPTIONS.find((c) => c.name === item.colorName) ?? COLOR_OPTIONS[0];
      const productBlob = await productizeDetectedItemPhoto(file, item, selectedColor.hex);
      withImages.push({ ...item, productBlob, productUrl: URL.createObjectURL(productBlob) });
      setOutfitProgress(0.25 + 0.75 * ((i + 1) / detected.length));
    }

    setDetectedItems(withImages);
    setStage('outfitResult');
  };

  const editDetectedItem = (item: DetectedItem) => {
    setEditingItem({ ...item });
    setSheet('edit');
  };

  const updateEditingColor = (nextName: string) => {
    const color = COLOR_OPTIONS.find((c) => c.name === nextName) ?? COLOR_OPTIONS[0];
    setEditingItem((item) => item ? { ...item, colorName: color.name, wuxing: color.wuxing } : item);
  };

  const saveEditingItem = () => {
    if (!editingItem) return;
    setDetectedItems((items) => items.map((item) => item.id === editingItem.id ? editingItem : item));
    setSheet(null);
    setEditingItem(undefined);
    showUnavailable('已儲存');
  };

  const removeDetectedItem = (id: string) => {
    setDetectedItems((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed?.productUrl) URL.revokeObjectURL(removed.productUrl);
      const next = items.filter((item) => item.id !== id);
      if (next.length === 0) {
        setStage('outfitCamera');
        showUnavailable('已全部移除，請重拍一張。');
      }
      return next;
    });
  };

  const addAllDetectedItems = async () => {
    if (detectedItems.length === 0) return;
    setSheet(null);

    // 商品圖已在 review 階段（analyzeOutfitPhoto）逐件生成好 → 這裡直接沿用，不再重打 gpt-image-2。
    // 只在極端情況（沒 productBlob）才補生成，避免漏圖。
    const originalId = outfitPhotoBlob ? await storeImage(outfitPhotoBlob) : undefined;
    for (const item of detectedItems) {
      const selectedColor = COLOR_OPTIONS.find((c) => c.name === item.colorName) ?? COLOR_OPTIONS[0];
      const productBlob =
        item.productBlob ??
        (outfitPhotoBlob
          ? await productizeDetectedItemPhoto(outfitPhotoBlob, item, selectedColor.hex)
          : makeGarmentBlob(item.category, selectedColor.hex));
      const imageId = await storeImage(productBlob);
      await addItem({
        id: uuid(),
        name: item.name.trim() || undefined,
        imageId,
        originalId,
        brand: item.brand.trim() || undefined,
        category: item.category,
        mainColorHex: selectedColor.hex,
        colorName: item.colorName,
        wuxing: item.wuxing,
        season: item.season,
        price: item.price ? Number(item.price) : undefined,
        tags: [],
        wearCount: 0,
        createdAt: Date.now(),
      });
    }
    setDoneCount(detectedItems.length);
    setSheet('done');
  };

  const onFile = async (file: File, opts?: { fromLink?: boolean }) => {
    setOriginalBlob(file);
    setOriginalUrl(URL.createObjectURL(file));
    setStage('processing');
    setProgress(0);

    // 流程：GPT 依原圖直接產出「去背商品圖」（background:transparent 已含去背，無需再去背一次）。
    // 沒設定 key 或 GPT 失敗 → 退回本機 WASM 去背；WASM 也失敗 → 用原圖。
    let processed: Blob;
    let cutout = true; // 是否取得真正的去背輪廓（決定要不要加貼紙白邊）
    // fromLink：文字欄位已由連結帶入、分類也已判斷，不該再喊「分類預設上衣」。
    let note = opts?.fromLink
      ? '已用你上傳的圖片建檔，商品資訊已帶入，請確認。'
      : '自動分類引擎尚未串接，分類先預設為上衣，請手動調整。';
    try {
      if (isItemPhotoAvailable()) {
        setProcLabel('AI 生成商品照中…');
        setProcIndeterminate(true);
        processed = await productizeItemPhoto(file);
      } else {
        setProcLabel('去背中…');
        setProcIndeterminate(false);
        processed = await removeBackground(file, setProgress);
        note = '未設定 OpenAI API key，已改用本機去背（非商品照）。';
      }
    } catch (e) {
      console.error(e);
      try {
        setProcLabel('去背中…');
        setProcIndeterminate(false);
        processed = await removeBackground(file, setProgress);
        note = '商品照生成失敗，已改用本機去背。';
      } catch (e2) {
        console.error(e2);
        processed = file; // 連去背都失敗 → 用原圖續行
        cutout = false;
        note = '去背失敗，先用原圖建檔，可稍後重拍。';
      }
    }

    // 主色用「去背圖」計算（白邊/陰影會干擾取色，故在加貼紙前先算）
    const hex = await dominantColor(processed);
    const { colorName, wuxing } = colorToWuxing(hex);
    setAnalysis({ hex, colorName, wuxing });
    applyDetectedColor(colorName, wuxing);

    // 有去背輪廓才加「白邊 + 柔和投影」貼紙效果
    let display = processed;
    if (cutout) {
      try {
        setProcLabel('加上貼紙白邊…');
        setProcIndeterminate(true);
        display = await stickerize(processed);
      } catch (e) {
        console.error(e); // 加工失敗就用原本去背圖，不阻斷流程
      }
    }

    setProcessedBlob(display);
    setPreviewUrl(URL.createObjectURL(display));
    setStage('form');
    showUnavailable(note);
  };

  const startLinkFlow = () => {
    setLinkUrl('');
    setStage('link');
  };

  // 貼上商品連結 → 解析網頁中繼資料（品名/品牌/價格/圖）→ 處理圖片 → 帶入單件表單。
  const resolveLink = async () => {
    if (!isValidUrl(linkUrl)) {
      showUnavailable('請貼上有效的商品網址（http / https）');
      return;
    }

    setStage('processing');
    setProgress(0);
    setProcLabel('抓取商品資訊…');
    setProcIndeterminate(true);

    let meta;
    try {
      meta = await parseProductLink(linkUrl);
    } catch (e) {
      console.error(e);
      showUnavailable(e instanceof Error ? e.message : '連結解析失敗，請改用拍照新增。');
      setStage('link');
      return;
    }

    // 帶入文字欄位（解析不到的留空，使用者可手動補）
    setItemName(meta.name ?? '');
    setBrand(meta.brand ?? '');
    setPrice(meta.price !== undefined ? String(meta.price) : '');
    const cat: Category = meta.category ?? '上衣';
    setCategory(cat);

    // 抓商品圖 → 去背 / 商品照 → 貼紙白邊 →（取色在加白邊前算）
    let original: Blob | undefined;
    let display: Blob | undefined;
    let note = meta.category
      ? '已帶入商品資訊，請確認後加入衣櫥。'
      : '已帶入商品資訊；無法判斷分類，先預設上衣，請手動調整。';

    if (meta.imageUrl) {
      setProcLabel('處理商品圖片…');
      const raw = await fetchProductImage(meta.imageUrl);
      if (raw) {
        original = raw;
        let processed: Blob;
        let cutout = true;
        try {
          if (isItemPhotoAvailable()) {
            setProcLabel('AI 生成商品照中…');
            processed = await productizeItemPhoto(raw, cat);
          } else {
            setProcLabel('去背中…');
            setProcIndeterminate(false);
            processed = await removeBackground(raw, setProgress);
          }
        } catch (e) {
          console.error(e);
          try {
            setProcLabel('去背中…');
            setProcIndeterminate(false);
            processed = await removeBackground(raw, setProgress);
          } catch (e2) {
            console.error(e2);
            processed = raw; // 連去背都失敗 → 用原圖
            cutout = false;
          }
        }
        display = processed;
        if (cutout) {
          try {
            setProcLabel('加上貼紙白邊…');
            setProcIndeterminate(true);
            display = await stickerize(processed);
          } catch (e) {
            console.error(e);
            display = processed;
          }
        }
      }
    }

    if (!display) {
      // 抓不到圖（多為 JS 渲染 / 反爬蟲的電商，如 UNIQLO）→ 照常進表單：
      // 抓到的欄位帶入、沒抓到的留空，圖片在表單裡留一個上傳入口給使用者。
      setProcessedBlob(undefined);
      setAnalysis(undefined);
      setOriginalBlob(undefined);
      setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return undefined; });
      setOriginalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return undefined; });
      setStage('form');
      showUnavailable('沒抓到商品圖，已帶入能讀到的欄位；請補上其餘欄位並上傳一張商品圖。');
      return;
    }

    const hex = await dominantColor(display);
    const { colorName: cName, wuxing: cWuxing } = colorToWuxing(hex);
    setAnalysis({ hex, colorName: cName, wuxing: cWuxing });
    applyDetectedColor(cName, cWuxing);
    setOriginalBlob(original);
    setOriginalUrl(original ? URL.createObjectURL(original) : undefined);
    setProcessedBlob(display);
    setPreviewUrl(URL.createObjectURL(display));
    setStage('form');
    showUnavailable(note);
  };

  const save = async () => {
    if (!processedBlob || !analysis) return;
    const imageId = await storeImage(processedBlob);
    const originalId = originalBlob ? await storeImage(originalBlob) : undefined;
    const selectedColor = COLOR_OPTIONS.find((c) => c.name === colorName);
    await addItem({
      id: uuid(),
      name: itemName.trim() || undefined,
      imageId,
      originalId,
      brand: brand.trim() || undefined,
      category,
      mainColorHex: selectedColor?.hex ?? analysis.hex,
      colorName,
      wuxing,
      season,
      price: price ? Number(price) : undefined,
      tags: [],
      wearCount: 0,
      createdAt: Date.now(),
    });
    nav('/closet', { replace: true });
  };

  const immersive = stage === 'itemCamera' || stage === 'outfitCamera' || stage === 'outfitAnalyzing' || stage === 'outfitResult';

  return (
    <div
      className={immersive ? 'relative min-h-[100dvh] overflow-hidden bg-ink text-inverse' : 'px-5 py-5'}
      style={{ paddingBottom: immersive ? undefined : 'var(--safe-bottom)' }}
    >
      {!immersive && (
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="text-muted">取消</button>
          <span className="font-serif text-lg">新增衣物</span>
          <span className="w-8" />
        </div>
      )}

      {stage === 'pick' && (
        <div className="mt-10 space-y-3">
          <ActionButton
            title="拍單品"
            description="拍一件衣物，產生帶白邊的商品貼紙圖"
            onClick={startItemFlow}
          />
          <ActionButton
            title="拍整身"
            description="拍整套或單件，AI 會自動判斷畫面中的每一件"
            onClick={startOutfitFlow}
          />
          <ActionButton
            title="從電商匯入"
            description="貼購物網址，自動抓品牌、品名與價格"
            onClick={startLinkFlow}
          />
          <p className="px-1 pt-2 text-xs text-muted">
            三種方式都會整理成衣櫥單品；拍攝路徑會產生帶白邊的商品貼紙圖，並抽出主色對應五行。
          </p>

          <button
            type="button"
            onClick={() => setShowKeyModal(true)}
            className="mt-4 flex w-full items-center justify-between rounded-xl border border-line bg-card px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium text-ink">OpenAI API Key</span>
              <span className="mt-0.5 block text-xs text-muted">
                {keyConfigured ? '已設定，AI 生成商品照／整套辨識已啟用' : '未設定，將改用本機去背（非 AI 商品照）'}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${keyConfigured ? 'bg-bg-muted text-ink' : 'bg-seal/10 text-seal'}`}>
              {keyConfigured ? '已設定' : '設定'}
            </span>
          </button>
        </div>
      )}

      {stage === 'link' && (
        <LinkImportPanel
          value={linkUrl}
          onChange={setLinkUrl}
          onSubmit={resolveLink}
          onBack={() => setStage('pick')}
        />
      )}

      {stage === 'processing' && (
        <div className="mt-24 text-center">
          {procIndeterminate ? (
            <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-line border-t-seal" />
          ) : (
            <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-seal transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <p className="mt-3 text-sm text-muted">
            {procLabel}{!procIndeterminate && `${Math.round(progress * 100)}%`}
          </p>
          {procIndeterminate && (
            <p className="mt-1 text-xs text-faint">向 OpenAI 生成中，約需數秒</p>
          )}
        </div>
      )}

      {stage === 'form' && (
        <SingleItemForm
          hasImage={!!processedBlob}
          originalUrl={originalUrl}
          previewUrl={previewUrl}
          itemName={itemName}
          brand={brand}
          category={category}
          colorName={colorName}
          wuxing={wuxing}
          season={season}
          price={price}
          onPickImage={(f) => onFile(f, { fromLink: true })}
          onNameChange={setItemName}
          onBrandChange={setBrand}
          onCategoryChange={(value) => setCategory(value as Category)}
          onColorChange={updateColor}
          onWuxingChange={(value) => setWuxing(value as WuXing)}
          onSeasonChange={(value) => setSeason(value as Season)}
          onPriceChange={setPrice}
          onSave={save}
        />
      )}

      {stage === 'itemCamera' && (
        <ItemCamera onCancel={() => setStage('pick')} onPick={onFile} />
      )}

      {stage === 'outfitCamera' && (
        <OutfitCamera onCancel={resetOutfitFlow} onPick={analyzeOutfitPhoto} />
      )}

      {stage === 'outfitAnalyzing' && (
        <div className="grid min-h-[100dvh] place-items-center px-8 text-center">
          <div className="w-full max-w-xs">
            <p className="font-medium">{outfitBusyLabel}</p>
            <p className="mt-2 text-xs leading-5 text-white/60">辨識單品並生成帶白邊的商品貼紙圖</p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${Math.max(6, Math.round(outfitProgress * 100))}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-white/60">{Math.round(outfitProgress * 100)}%</div>
          </div>
        </div>
      )}

      {stage === 'outfitResult' && (
        <OutfitResult
          photoUrl={outfitPhotoUrl}
          items={detectedItems}
          onRetake={() => setStage('outfitCamera')}
          onClose={resetOutfitFlow}
          onEdit={editDetectedItem}
          onRemove={removeDetectedItem}
          onAddAll={addAllDetectedItems}
        />
      )}

      {sheet === 'edit' && editingItem && (
        <EditDetectedSheet
          item={editingItem}
          onClose={() => { setSheet(null); setEditingItem(undefined); }}
          onSave={saveEditingItem}
          onChange={setEditingItem}
          onColorChange={updateEditingColor}
        />
      )}

      {sheet === 'done' && (
        <DoneSheet
          count={doneCount}
          items={detectedItems}
          onClose={() => {
            resetOutfitFlow();
            nav('/closet', { replace: true });
          }}
        />
      )}

      {showKeyModal && (
        <ApiKeyModal
          onClose={() => setShowKeyModal(false)}
          onSaved={(configured, message) => {
            setKeyConfigured(configured);
            setShowKeyModal(false);
            showUnavailable(message);
          }}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}

function LinkImportPanel({
  value,
  onChange,
  onSubmit,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mt-10 space-y-4">
      <div className="rounded-xl border border-line bg-card px-4 py-4 shadow-card">
        <div className="font-medium text-ink">從電商匯入</div>
        <p className="mt-1 text-xs leading-5 text-muted">
          貼上商品網址，會自動抓品名、品牌、價格與商品圖。
        </p>
      </div>

      <div className="rounded-xl border border-line bg-card p-4 shadow-card">
        <label className="mb-2 block px-0.5 text-sm text-ink">商品網址</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); }}
          type="url"
          inputMode="url"
          autoFocus
          placeholder="https://"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-ink"
        />
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="mt-4 w-full rounded-xl bg-seal py-3.5 font-medium text-white disabled:opacity-40"
        >
          解析連結
        </button>
      </div>

      <button onClick={onBack} className="w-full rounded-xl border border-line bg-card py-3.5 text-sm font-medium text-muted">
        返回選擇方式
      </button>

      <p className="px-1 text-xs leading-5 text-muted">
        經第三方 CORS 代理抓取，僅供本機 demo；部分網站可能擋抓取或缺欄位，可再手動補。
      </p>
    </div>
  );
}

function SingleItemForm({
  hasImage,
  originalUrl,
  previewUrl,
  itemName,
  brand,
  category,
  colorName,
  wuxing,
  season,
  price,
  onPickImage,
  onNameChange,
  onBrandChange,
  onCategoryChange,
  onColorChange,
  onWuxingChange,
  onSeasonChange,
  onPriceChange,
  onSave,
}: {
  hasImage: boolean;
  originalUrl?: string;
  previewUrl?: string;
  itemName: string;
  brand: string;
  category: Category;
  colorName: string;
  wuxing: WuXing;
  season: Season;
  price: string;
  onPickImage: (f: File) => void;
  onNameChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onWuxingChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-5">
      {hasImage ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <figure>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-muted">
                {originalUrl && <img src={originalUrl} className="h-full w-full object-contain" />}
              </div>
              <figcaption className="mt-1.5 text-center text-xs text-muted">原圖</figcaption>
            </figure>
            <figure>
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-muted">
                {previewUrl && <img src={previewUrl} className="h-full w-full object-contain" />}
              </div>
              <figcaption className="mt-1.5 text-center text-xs text-muted">商品貼紙圖</figcaption>
            </figure>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="wuxing-dot" style={{ background: WUXING_HEX[wuxing] }} />
            <span className="text-sm text-muted">主色 {colorName}・五行 {wuxing}</span>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <label className="flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-soft bg-bg-muted text-center">
            <span className="text-2xl text-muted">＋</span>
            <span className="text-sm font-medium text-ink">上傳商品圖</span>
            <span className="px-6 text-xs leading-5 text-muted">沒從連結抓到圖。從相簿選一張（網站截圖或存下的商品照都行），會自動去背成商品圖並判斷主色。</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }}
            />
          </label>
          <label className="block w-full cursor-pointer rounded-xl border border-line bg-card py-3 text-center text-sm font-medium text-ink">
            改用拍照
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }}
            />
          </label>
        </div>
      )}

      <ItemFields
        itemName={itemName}
        brand={brand}
        category={category}
        colorName={colorName}
        wuxing={wuxing}
        season={season}
        price={price}
        onNameChange={onNameChange}
        onBrandChange={onBrandChange}
        onCategoryChange={onCategoryChange}
        onColorChange={onColorChange}
        onWuxingChange={onWuxingChange}
        onSeasonChange={onSeasonChange}
        onPriceChange={onPriceChange}
      />

      <button
        onClick={onSave}
        disabled={!hasImage}
        className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white disabled:opacity-40"
      >
        {hasImage ? '確認，加入衣櫥' : '請先上傳商品圖'}
      </button>
    </div>
  );
}

function ItemFields({
  itemName,
  brand,
  category,
  colorName,
  wuxing,
  season,
  price,
  onNameChange,
  onBrandChange,
  onCategoryChange,
  onColorChange,
  onWuxingChange,
  onSeasonChange,
  onPriceChange,
}: {
  itemName: string;
  brand: string;
  category: Category;
  colorName: string;
  wuxing: WuXing;
  season: Season;
  price: string;
  onNameChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onWuxingChange: (value: string) => void;
  onSeasonChange: (value: string) => void;
  onPriceChange: (value: string) => void;
}) {
  return (
    <>
      <Field label="命名">
        <input
          value={itemName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="例：白棉 T 恤"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-ink"
        />
      </Field>

      <Field label="品牌" hint="選填">
        <input
          value={brand}
          onChange={(e) => onBrandChange(e.target.value)}
          placeholder="未填"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-ink"
        />
      </Field>

      <Field label="分類" hint="分析帶入">
        <Select value={category} onChange={onCategoryChange}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="顏色" hint="主色">
          <Select value={colorName} onChange={onColorChange}>
            {COLOR_OPTIONS.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field label="五行" hint="由顏色推">
          <Select value={wuxing} onChange={onWuxingChange}>
            {(['金', '木', '水', '火', '土'] as WuXing[]).map((wx) => (
              <option key={wx} value={wx}>{wx}</option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="mt-2 px-1 text-xs text-muted">
        主色 {colorName} · 五行 {wuxing}（顏色改了會自動更新）
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="季節">
          <Select value={season} onChange={onSeasonChange}>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>

        <Field label="價格" hint="算 CPW 用">
          <input
            type="number"
            inputMode="numeric"
            value={price}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="選填"
            className="w-full rounded-xl border border-line bg-card px-4 py-3 outline-none focus:border-ink"
          />
        </Field>
      </div>
    </>
  );
}

function ItemCamera({ onCancel, onPick }: { onCancel: () => void; onPick: (file: File) => void }) {
  return (
    <CameraCapture
      title="拍單品"
      frameLabel="單品相機畫面"
      hint={<>把單件衣物放在畫面中央<br />會自動產生商品貼紙圖</>}
      albumLabel="從相簿選擇單品"
      onCancel={onCancel}
      onPick={onPick}
    />
  );
}

function OutfitCamera({ onCancel, onPick }: { onCancel: () => void; onPick: (file: File) => void }) {
  return (
    <CameraCapture
      title="拍整身"
      frameLabel="整身相機畫面"
      hint={<>拍整套穿搭或單件都可以<br />AI 會自動判斷、辨識出每一件</>}
      albumLabel="從相簿選擇整身"
      onCancel={onCancel}
      onPick={onPick}
    />
  );
}

function CameraCapture({
  title,
  frameLabel,
  hint,
  albumLabel,
  onCancel,
  onPick,
}: {
  title: string;
  frameLabel: string;
  hint: React.ReactNode;
  albumLabel: string;
  onCancel: () => void;
  onPick: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('此瀏覽器不支援即時相機，請改用相簿或系統相機。');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setCameraError('無法開啟相機，請允許權限或改用相簿。');
        }
      }
    };

    startCamera();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const captureFrame = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );
    if (!blob) return;

    onPick(new File([blob], `${title}.jpg`, { type: 'image/jpeg' }));
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper text-ink">
      <div className="flex items-center justify-between px-5 py-5">
        <span className="w-9" />
        <span className="font-serif text-lg">{title}</span>
        <button onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full border border-line bg-card text-xl text-muted">×</button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-panel border border-line-soft bg-bg-muted shadow-card">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
          />
          {!cameraReady && (
            <div className="absolute inset-0 grid place-items-center px-8 text-center">
              <div>
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-seal" />
                <p className="text-sm text-muted">{cameraError || '正在開啟相機…'}</p>
              </div>
            </div>
          )}
          <CameraCorner className="left-[8%] top-[8%] border-b-0 border-r-0" />
          <CameraCorner className="right-[8%] top-[8%] border-b-0 border-l-0" />
          <CameraCorner className="bottom-[8%] left-[8%] border-r-0 border-t-0" />
          <CameraCorner className="bottom-[8%] right-[8%] border-l-0 border-t-0" />
          <span className="absolute inset-x-0 top-4 text-center text-xs text-black/50">{frameLabel}</span>
        </div>
      </div>

      <div className="px-5 pb-9 pt-5 text-center">
        <p className="mb-5 text-sm leading-6 text-muted">{hint}</p>
        <button
          type="button"
          onClick={captureFrame}
          disabled={!cameraReady}
          className="mx-auto block h-[72px] w-[72px] rounded-full border-4 border-line-soft bg-card shadow-card active:scale-95 disabled:opacity-40"
          aria-label="拍照"
        />
        {cameraError && (
          <label className="mt-4 inline-block cursor-pointer text-xs text-muted underline underline-offset-4">
            用系統相機拍攝
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
            />
          </label>
        )}
        <label className="mt-4 block cursor-pointer text-xs text-muted underline underline-offset-4">
          {albumLabel}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
          />
        </label>
      </div>
    </div>
  );
}

function CameraCorner({ className }: { className: string }) {
  return <div className={`absolute h-7 w-7 border-2 border-black/45 ${className}`} />;
}

function OutfitResult({
  photoUrl,
  items,
  onRetake,
  onClose,
  onEdit,
  onRemove,
  onAddAll,
}: {
  photoUrl?: string;
  items: DetectedItem[];
  onRetake: () => void;
  onClose: () => void;
  onEdit: (item: DetectedItem) => void;
  onRemove: (id: string) => void;
  onAddAll: () => void;
}) {
  const SHEET_MIN = 12;
  const SHEET_MAX = 56;
  const SNAP_MID = 34;
  const [sheetHeight, setSheetHeight] = useState(SHEET_MAX);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const sheetCollapsed = sheetHeight <= SNAP_MID;

  const startSheetDrag = (clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: sheetHeight };
  };

  const moveSheetDrag = (clientY: number) => {
    if (!dragRef.current) return;
    const deltaVh = ((clientY - dragRef.current.startY) / window.innerHeight) * 100;
    const nextHeight = dragRef.current.startHeight - deltaVh;
    setSheetHeight(Math.min(SHEET_MAX, Math.max(SHEET_MIN, nextHeight)));
  };

  const endSheetDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setSheetHeight((height) => height < SNAP_MID ? SHEET_MIN : SHEET_MAX);
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black text-ink">
      <div className="absolute inset-0 overflow-hidden bg-bg-muted">
        {photoUrl ? (
          <img src={photoUrl} className="h-full w-full object-cover opacity-75" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">整身照片</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="absolute inset-x-0 top-0 z-10 flex justify-between p-4">
          <button onClick={onRetake} className="rounded-full bg-black/55 px-4 py-2 text-sm text-white">‹ 重拍</button>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-xl text-white">×</button>
        </div>

        <div className="absolute inset-x-0 top-16 text-center text-xs text-black/70">圓點是 AI 辨識到的單品</div>

        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => onEdit(item)}
            className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-card text-xs font-bold shadow-card">
              {index + 1}
            </span>
            <span className="rounded-full border border-ink bg-card px-2.5 py-1 text-xs">{item.category}</span>
          </button>
        ))}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-t-panel bg-card px-4 pt-3 text-ink shadow-card transition-[height] duration-200"
        style={{ height: `${sheetHeight}dvh`, paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
      >
        <div
          className="touch-none pb-3"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            startSheetDrag(e.clientY);
          }}
          onPointerMove={(e) => moveSheetDrag(e.clientY)}
          onPointerUp={endSheetDrag}
          onPointerCancel={endSheetDrag}
        >
          <button
            type="button"
            onClick={() => setSheetHeight((height) => height <= SNAP_MID ? SHEET_MAX : SHEET_MIN)}
            className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-line-soft"
            aria-label={sheetCollapsed ? '展開辨識結果' : '收合辨識結果'}
          />
          <div className="text-lg font-bold">辨識到 {items.length} 件單品</div>
          <div className="mt-1 text-sm text-muted">點照片上的圓點或下方任一件可編輯；確認後一起加入衣櫥</div>
        </div>

        <div className={`${sheetCollapsed ? 'hidden' : 'flex'} h-[calc(100%-92px)] flex-col`}>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-line bg-card p-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-ink text-xs font-bold">{index + 1}</span>
                <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-bg-muted">
                  <DetectedThumb item={item} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="mt-1 truncate text-xs text-muted">{item.category} · {item.colorName}色 · 五行{item.wuxing}</div>
                </div>
                <button onClick={() => onEdit(item)} className="text-xs font-semibold underline underline-offset-2">編輯</button>
                <button onClick={() => onRemove(item.id)} className="px-1 text-lg text-muted">×</button>
              </div>
            ))}
          </div>

          <div className="bg-card pt-3">
            <button onClick={onAddAll} className="w-full rounded-xl bg-seal py-3.5 font-medium text-white">
              全部加入衣櫥（{items.length} 件）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditDetectedSheet({
  item,
  onClose,
  onSave,
  onChange,
  onColorChange,
}: {
  item: DetectedItem;
  onClose: () => void;
  onSave: () => void;
  onChange: (item: DetectedItem) => void;
  onColorChange: (value: string) => void;
}) {

  return (
    <div className="absolute inset-0 z-40 text-ink">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="關閉編輯" />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-panel bg-card px-5 pb-7 pt-4">
        <div className="mb-4 flex items-center">
          <button onClick={onClose} className="text-sm text-muted">‹ 返回</button>
          <h3 className="flex-1 text-center text-base font-bold">編輯衣物</h3>
          <span className="w-10" />
        </div>

        <div className="mb-4 grid h-36 place-items-center overflow-hidden rounded-xl border border-line bg-bg-muted">
          <DetectedThumb item={item} large />
        </div>

        <ItemFields
          itemName={item.name}
          brand={item.brand}
          category={item.category}
          colorName={item.colorName}
          wuxing={item.wuxing}
          season={item.season}
          price={item.price}
          onNameChange={(value) => onChange({ ...item, name: value })}
          onBrandChange={(value) => onChange({ ...item, brand: value })}
          onCategoryChange={(value) => onChange({ ...item, category: value as Category })}
          onColorChange={onColorChange}
          onWuxingChange={(value) => onChange({ ...item, wuxing: value as WuXing })}
          onSeasonChange={(value) => onChange({ ...item, season: value as Season })}
          onPriceChange={(value) => onChange({ ...item, price: value })}
        />

        <button onClick={onSave} className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white">
          儲存這件
        </button>
      </div>
    </div>
  );
}

function DoneSheet({ count, items, onClose }: { count: number; items: DetectedItem[]; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 text-ink">
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-panel bg-card px-5 pb-7 pt-6 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border-2 border-ink">
          <span className="text-4xl leading-none">✓</span>
        </div>
        <h3 className="text-lg font-bold">已加入衣櫥</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{count} 件已收進你的衣櫥<br />之後穿到時記錄一下，會自動算 CPW</p>
        <div className="my-5 flex justify-center gap-2">
          {items.map((item) => (
            <div key={item.id} className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-line bg-bg-muted">
              <DetectedThumb item={item} />
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full rounded-xl bg-seal py-3.5 font-medium text-white">
          回衣櫥
        </button>
      </div>
    </div>
  );
}

function ActionButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-line bg-card px-4 py-4 text-left shadow-card"
    >
      <span className="block font-medium text-ink">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
    </button>
  );
}

// review 縮圖：有生成好的商品圖就顯示真圖，否則回退 SVG 示意圖。
function DetectedThumb({ item, large }: { item: DetectedItem; large?: boolean }) {
  if (item.productUrl) {
    return <img src={item.productUrl} alt={item.name} className="h-full w-full object-contain" />;
  }
  const color = COLOR_OPTIONS.find((c) => c.name === item.colorName)?.hex ?? '#cccccc';
  return <GarmentIcon category={item.category} color={color} large={large} />;
}

function GarmentIcon({
  category,
  color,
  large,
}: {
  category: Category;
  color: string;
  large?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" className={large ? 'h-24 w-24' : 'h-9 w-9'} aria-hidden="true">
      <path d={garmentPath(category)} fill={color} stroke="#8c8c8c" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function makeGarmentBlob(category: Category, color: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#f1f0ec"/><path d="${garmentPath(category)}" fill="${color}" stroke="#8c8c8c" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

async function productizeDetectedItemPhoto(
  source: Blob,
  item: DetectedItem,
  fallbackColor: string
): Promise<Blob> {
  if (!isItemPhotoAvailable()) {
    return makeGarmentBlob(item.category, fallbackColor);
  }

  const target = [
    item.name,
    `${item.category}`,
    `${item.colorName} color`,
    `located around x=${Math.round(item.x)}%, y=${Math.round(item.y)}% of the photo`,
  ].join(', ');

  try {
    const product = await productizeItemPhoto(source, item.category, item.colorName, target);
    return await stickerize(product);
  } catch (e) {
    console.error(e);
    return makeGarmentBlob(item.category, fallbackColor);
  }
}

function garmentPath(category: Category): string {
  const paths: Record<Category, string> = {
    上衣: 'M22 10 L13 17 L18 26 L24 22 L24 54 L40 54 L40 22 L46 26 L51 17 L42 10 L38 13 C34 16 30 16 26 13 Z',
    下身: 'M23 11 L41 11 L40 54 L33 54 L32 30 L31 54 L24 54 Z',
    外套: 'M22 10 L11 17 L16 28 L22 24 L22 54 L30 54 L30 15 L34 15 L34 54 L42 54 L42 24 L48 28 L53 17 L42 10 L32 14 Z',
    洋裝: 'M25 10 L20 17 L25 23 L25 27 L17 54 L47 54 L39 27 L39 23 L44 17 L39 10 L35 13 C32 16 31 16 29 13 Z',
    鞋: 'M12 34 L30 34 Q33 40 38 41 Q44 42 44 46 L12 46 Z',
    配件: 'M32 16 a16 16 0 1 0 0.01 0 M32 26 a6 6 0 1 0 0.01 0',
  };
  return paths[category];
}

function FilePick({ label, capture, onPick }: { label: string; capture?: boolean; onPick: (f: File) => void }) {
  return (
    <label className="block w-full cursor-pointer rounded-xl border border-line bg-card py-3.5 text-center font-medium text-ink">
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as any } : {})}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }}
      />
    </label>
  );
}
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className="text-sm text-ink">{label}</span>
        {hint && <span className="text-xs text-muted underline underline-offset-2">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-card px-4 py-3 text-ink outline-none focus:border-ink disabled:bg-surface disabled:text-muted"
    >
      {children}
    </select>
  );
}

function ApiKeyModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (configured: boolean, message: string) => void;
}) {
  const [value, setValue] = useState(getUserOpenAIKey());
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await saveOpenAIKey(value);
    } finally {
      setSaving(false);
    }
    const configured = !!value.trim();
    onSaved(configured, configured ? '已儲存 OpenAI API Key' : '已清除 OpenAI API Key');
  };

  return (
    <div className="fixed inset-0 z-50 text-ink">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="關閉" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-panel bg-card px-5 pb-7 pt-5" style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
        <div className="mb-1 flex items-center">
          <h3 className="flex-1 font-serif text-lg">OpenAI API Key</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full border border-line text-muted">×</button>
        </div>
        <p className="mb-4 text-xs leading-5 text-muted">
          填入你的 OpenAI API Key，啟用「AI 生成商品照」與「整套穿搭辨識」。
          金鑰只存在這台裝置（IndexedDB），不會上傳，也可隨時清除。
        </p>

        <div className="relative">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={reveal ? 'text' : 'password'}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder="sk-..."
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 pr-16 outline-none focus:border-ink"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute inset-y-0 right-3 my-auto text-xs text-muted underline underline-offset-2"
          >
            {reveal ? '隱藏' : '顯示'}
          </button>
        </div>

        <button
          onClick={submit}
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-seal py-3.5 font-medium text-white disabled:opacity-40"
        >
          {saving ? '儲存中…' : value.trim() ? '儲存金鑰' : '清除金鑰'}
        </button>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-xs text-muted underline underline-offset-4"
        >
          前往 OpenAI 取得 API Key
        </a>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-5"
      style={{ bottom: 'calc(var(--safe-bottom) + 24px)' }}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-sm rounded-full bg-ink px-4 py-2.5 text-center text-sm text-inverse shadow-card">
        {message}
      </div>
    </div>
  );
}
