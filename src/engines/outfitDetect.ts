// 整套穿搭辨識引擎 —— 用 OpenAI vision 將全身照拆成多件單品 metadata。
//
// ⚠️ Hackathon 直連模式：API key 走 import.meta.env.VITE_OPENAI_API_KEY。
//    VITE_ 變數會被打進前端 bundle，僅限本機 demo；上線請改後端 / serverless proxy。
import type { Category, Season, WuXing } from '../db/db';
import { getOpenAIKey, hasOpenAIKey } from './openaiKey';

const ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';

const CATEGORY_VALUES: Category[] = ['上衣', '下身', '外套', '洋裝', '鞋', '配件'];
const COLOR_VALUES = ['白', '灰', '金', '綠', '藍', '黑', '紅', '紫', '卡其', '米', '棕'] as const;
const WUXING_VALUES: WuXing[] = ['金', '木', '水', '火', '土'];
const SEASON_VALUES: Season[] = ['四季', '春夏', '春秋', '秋冬'];

export interface OutfitDetectionItem {
  name: string;
  brand: string;
  category: Category;
  colorName: string;
  wuxing: WuXing;
  season: Season;
  price: string;
  x: number;
  y: number;
}

interface OutfitDetectionResponse {
  items: OutfitDetectionItem[];
}

export function isOutfitDetectionAvailable(): boolean {
  return hasOpenAIKey();
}

export async function detectOutfitItems(input: Blob): Promise<OutfitDetectionItem[]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error('未設定 OpenAI API key，無法辨識整套穿搭');
  }

  const imageUrl = await blobToDataUrl(input);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: import.meta.env.VITE_OPENAI_VISION_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                'Analyze this outfit photo and identify each visible fashion item.',
                'Return only wearable/clothing items that should be saved into a digital closet.',
                'Use these category values only: 上衣, 下身, 外套, 洋裝, 鞋, 配件.',
                'Use these colorName values only: 白, 灰, 金, 綠, 藍, 黑, 紅, 紫, 卡其, 米, 棕.',
                'Infer wuxing from colorName. Use season as 四季 unless the item is clearly seasonal.',
                'For x and y, return the visual center of that item as percentages from 0 to 100 within the image.',
                'If there is a pair of shoes, return it as one item. Ignore body parts, face, hair, background, phone, and bag unless the bag is clearly a fashion accessory.',
                'Return 1 to 6 items, ordered from top of body to bottom, then accessories.',
              ].join(' '),
            },
            {
              type: 'input_image',
              image_url: imageUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'outfit_detection',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                minItems: 1,
                maxItems: 6,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    brand: { type: 'string' },
                    category: { type: 'string', enum: CATEGORY_VALUES },
                    colorName: { type: 'string', enum: COLOR_VALUES },
                    wuxing: { type: 'string', enum: WUXING_VALUES },
                    season: { type: 'string', enum: SEASON_VALUES },
                    price: { type: 'string' },
                    x: { type: 'number', minimum: 0, maximum: 100 },
                    y: { type: 'number', minimum: 0, maximum: 100 },
                  },
                  required: ['name', 'brand', 'category', 'colorName', 'wuxing', 'season', 'price', 'x', 'y'],
                },
              },
            },
            required: ['items'],
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI 整套辨識失敗 (${res.status})：${detail.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = extractOutputText(json);
  const parsed = JSON.parse(text) as OutfitDetectionResponse;
  return parsed.items.map(normalizeItem);
}

function normalizeItem(item: OutfitDetectionItem): OutfitDetectionItem {
  return {
    ...item,
    brand: item.brand?.trim() ?? '',
    price: item.price?.trim() ?? '',
    x: clamp(item.x, 6, 94),
    y: clamp(item.y, 8, 92),
  };
}

function extractOutputText(json: any): string {
  if (typeof json.output_text === 'string') return json.output_text;

  for (const output of json.output ?? []) {
    for (const content of output.content ?? []) {
      if (typeof content.text === 'string') return content.text;
    }
  }

  throw new Error('OpenAI 回傳缺少辨識結果文字');
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('讀取圖片失敗'));
    reader.readAsDataURL(blob);
  });
}
