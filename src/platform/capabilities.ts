// =============================================================
// 平台能力抽象層 —— 把「執行環境 / 定位 / 通知 / 相機」等與平台相關的能力
// 收斂到這一層。目前是純 PWA，全部走瀏覽器原生 API；
// 日後導入 Capacitor 包成 iOS App 時，只在這層改用 Capacitor plugin 覆寫，
// 上層 screens / engines 完全不用改。
//
// 規則（給所有功能負責人）：screens 不要直接碰 navigator.* / Notification，
// 一律走這個檔的函式，未來換原生才不會散落各處。詳見 docs/iOS_封裝路徑.md。
// =============================================================

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function capacitor(): CapacitorGlobal | undefined {
  return (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/**
 * 是否跑在 Capacitor 原生殼裡（iOS / Android App）。
 * 純 PWA 階段恆為 false；導入 Capacitor 後，@capacitor/core 會在 window.Capacitor
 * 暴露 isNativePlatform()，屆時實機回 true。
 */
export function isNativePlatform(): boolean {
  return !!capacitor()?.isNativePlatform?.();
}

/** 目前執行平台標籤，方便除錯與分支邏輯。 */
export function platformName(): 'web' | 'ios' | 'android' {
  const p = capacitor()?.getPlatform?.();
  return p === 'ios' || p === 'android' ? p : 'web';
}

/** 取得目前座標；無權限 / 不支援回 null。未來原生可改用 Capacitor Geolocation。 */
export function getCoords(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 600000 }
    );
  });
}

/**
 * 要求通知權限（onboarding 第④步 / 通知偏好頁用）。
 * ⚠️ 純 PWA 在 iOS 需「加入主畫面」後才可能拿到權限，且無法本機排程；
 * 每日開運推播要等 Phase 1 後端排程（Web Push）。導入 Capacitor 後改用 Push Notifications plugin。
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}
