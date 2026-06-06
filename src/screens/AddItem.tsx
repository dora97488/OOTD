// 參考實作：把共用引擎（bgRemove / color / wuxing）+ 資料層串起來的最小可用流程。
// 衣櫥負責人可在此擴充：整身穿搭萃取、材質/品牌欄位、批次匯入等。
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { CATEGORIES, SEASONS, type Category, type Season, type WuXing } from '../db/db';
import { addItem, storeImage } from '../data';
import { removeBackground } from '../engines/bgRemove';
import { dominantColor } from '../engines/color';
import { colorToWuxing } from '../engines/wuxing';
import { WUXING_HEX } from '../constants/colors';

type Stage = 'pick' | 'processing' | 'form';

export default function AddItem() {
  const nav = useNavigate();
  const [stage, setStage] = useState<Stage>('pick');
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [processedBlob, setProcessedBlob] = useState<Blob>();
  const [originalBlob, setOriginalBlob] = useState<Blob>();
  const [analysis, setAnalysis] = useState<{ hex: string; colorName: string; wuxing: WuXing }>();
  const [category, setCategory] = useState<Category>('上衣');
  const [season, setSeason] = useState<Season>('四季');
  const [price, setPrice] = useState('');

  const onFile = async (file: File, doRemove: boolean) => {
    setOriginalBlob(file);
    setStage('processing');
    setProgress(0);
    try {
      const blob = doRemove ? await removeBackground(file, setProgress) : file;
      setProcessedBlob(blob);
      const hex = await dominantColor(blob);
      const { colorName, wuxing } = colorToWuxing(hex);
      setAnalysis({ hex, colorName, wuxing });
      setPreviewUrl(URL.createObjectURL(blob));
      setStage('form');
    } catch (e) {
      console.error(e);
      // 去背失敗 → 用原圖續行
      setProcessedBlob(file);
      const hex = await dominantColor(file);
      const { colorName, wuxing } = colorToWuxing(hex);
      setAnalysis({ hex, colorName, wuxing });
      setPreviewUrl(URL.createObjectURL(file));
      setStage('form');
    }
  };

  const save = async () => {
    if (!processedBlob || !analysis) return;
    const imageId = await storeImage(processedBlob);
    const originalId = originalBlob ? await storeImage(originalBlob) : undefined;
    await addItem({
      id: uuid(),
      imageId,
      originalId,
      category,
      mainColorHex: analysis.hex,
      colorName: analysis.colorName,
      wuxing: analysis.wuxing,
      season,
      price: price ? Number(price) : undefined,
      tags: [],
      wearCount: 0,
      createdAt: Date.now(),
    });
    nav('/closet', { replace: true });
  };

  return (
    <div className="px-5 py-5" style={{ paddingBottom: 'var(--safe-bottom)' }}>
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-muted">取消</button>
        <span className="font-serif text-lg">新增衣物</span>
        <span className="w-8" />
      </div>

      {stage === 'pick' && (
        <div className="mt-10 space-y-3">
          <FilePick label="拍照" capture onPick={(f) => onFile(f, true)} />
          <FilePick label="從相簿選" onPick={(f) => onFile(f, true)} />
          <p className="px-1 pt-2 text-xs text-muted">
            會自動去背（首次需下載模型，請稍候），並抽出主色對應五行。
          </p>
        </div>
      )}

      {stage === 'processing' && (
        <div className="mt-24 text-center">
          <div className="mx-auto h-2 w-48 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-seal transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">去背中…{Math.round(progress * 100)}%</p>
        </div>
      )}

      {stage === 'form' && analysis && (
        <div className="mt-5">
          <div className="mx-auto aspect-square w-48 overflow-hidden rounded-2xl border border-line bg-paper">
            {previewUrl && <img src={previewUrl} className="h-full w-full object-contain" />}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="wuxing-dot" style={{ background: WUXING_HEX[analysis.wuxing] }} />
            <span className="text-sm text-muted">主色 {analysis.colorName}・五行 {analysis.wuxing}</span>
          </div>

          <Field label="類別">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
              ))}
            </div>
          </Field>

          <Field label="季節">
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Chip key={s} active={season === s} onClick={() => setSeason(s)}>{s}</Chip>
              ))}
            </div>
          </Field>

          <Field label="價格（選填，算 CPW 用）">
            <input
              type="number" inputMode="numeric" value={price}
              onChange={(e) => setPrice(e.target.value)} placeholder="例：1280"
              className="w-full rounded-xl border border-line bg-card px-4 py-3"
            />
          </Field>

          <button onClick={save} className="mt-6 w-full rounded-xl bg-seal py-3.5 font-medium text-white">
            存進衣櫥
          </button>
        </div>
      )}
    </div>
  );
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
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-sm text-ink">{label}</div>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm ${active ? 'border-seal bg-seal text-white' : 'border-line bg-card text-muted'}`}
    >
      {children}
    </button>
  );
}
