// 圖片存取 —— 與資料表同屬資料層。screens / components 從 '../data' 取用，不要直接碰 db。
// 實作在 db/images.ts（壓縮入庫 1080px webp + 取 objectURL）。
// 日後接後端物件儲存（如 Supabase Storage）時，換 db/images.ts 內部即可。
export { storeImage, getImageURL, deleteImage } from '../db/images';
