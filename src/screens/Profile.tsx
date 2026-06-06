import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getProfile, countItems, exportAll, importAll } from '../data';
import PageHeader from '../components/PageHeader';
import { WUXING_HEX } from '../constants/colors';

export default function Profile() {
  const profile = useLiveQuery(() => getProfile());
  const itemCount = useLiveQuery(() => countItems(), [], 0);

  return (
    <div>
      <PageHeader title="我的" />
      <div className="px-5">
        {profile && (
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="text-sm text-muted">命主</div>
            <div className="mt-1 flex items-center gap-2">
              {profile.dayMasterWuxing && (
                <span className="h-3 w-3 rounded-full" style={{ background: WUXING_HEX[profile.dayMasterWuxing] }} />
              )}
              <span className="font-serif text-2xl">{profile.dayMasterWuxing ?? '—'}</span>
            </div>
            <div className="mt-2 text-sm text-muted">
              喜用 {profile.favorable.join('、')}｜忌 {profile.unfavorable.join('、')}
            </div>
            <div className="mt-1 text-xs text-muted">衣櫥共 {itemCount} 件</div>
          </div>
        )}

        {/* 資料安全網（基礎建設提供）：匯出 / 匯入。個人中心負責人可改樣式或搬位置。 */}
        <BackupSection />

        {/* TODO(個人中心負責人)：穿著統計（CPW/Colors by Category/Closet Distribution）、
            通知偏好(P1)、IG 樣板輸出。 */}
        <div className="mt-3 rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-muted shadow-card">
          穿著統計 / 通知偏好 / IG 匯出 —— 待補。規格 §5.4 / §5.6
        </div>
      </div>
    </div>
  );
}

// 備份 / 還原（基礎建設提供的本機資料安全網，串 data/backup.ts）。
function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();

  const doExport = async () => {
    setBusy(true);
    setMsg(undefined);
    try {
      const blob = await exportAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ootd-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('已匯出備份檔');
    } catch (e) {
      setMsg('匯出失敗：' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    if (!window.confirm('匯入會覆寫目前所有資料，確定要還原嗎？')) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const r = await importAll(file);
      setMsg(`已還原 ${r.items} 件單品、${r.images} 張圖片`);
    } catch (e) {
      setMsg('匯入失敗：' + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="text-sm font-medium text-ink">備份與還原</div>
      <p className="mt-1 text-xs text-muted">資料只存在本機，建議定期匯出。換機 / 清資料後可匯入還原。</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={doExport}
          disabled={busy}
          className="flex-1 rounded-xl bg-seal py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          匯出備份
        </button>
        <label className="flex-1 cursor-pointer rounded-xl border border-line bg-paper py-2.5 text-center text-sm text-ink">
          匯入還原
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
            }}
          />
        </label>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
