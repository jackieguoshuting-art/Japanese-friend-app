// 便利店商品池 — 3 大类 × 9 件 = 27 件
// 每个 Tab 内部进店时洗牌 + 随机 1-2 件品切れ
// needs 字段决定 checkout 时是否追加对应问轮
// subtag 字段:卡片左上角细分类标签(日文汉字)

// === フード(食物)9 件 ===
export const FOOD_ITEMS = [
  { id: 'onigiri',  emoji: '🍙', kana: 'おにぎり',    ja: '鮭おにぎり',       en: 'Salmon Onigiri',  price: 150, badge: 'HOT', subtag: '温食', needs: ['warm'] },
  { id: 'bento',    emoji: '🍱', kana: 'おべんとう',  ja: 'お弁当',           en: 'Bento Box',       price: 580, badge: 'HOT', subtag: '温食', needs: ['warm', 'chopsticks'] },
  { id: 'ramen',    emoji: '🍜', kana: 'カップラーメン', ja: 'カップラーメン', en: 'Cup Ramen',       price: 210, badge: null,  subtag: '温食', needs: ['warm', 'chopsticks'] },
  { id: 'nikuman',  emoji: '🥟', kana: 'にくまん',    ja: '肉まん',           en: 'Pork Bun',        price: 160, badge: 'HOT', subtag: '温食', needs: ['warm'] },
  { id: 'oden',     emoji: '🍢', kana: 'おでん',      ja: 'おでん',           en: 'Oden',            price: 200, badge: null,  subtag: '温食', needs: ['warm'] },
  { id: 'chicken',  emoji: '🍗', kana: 'チキン',      ja: 'チキン',           en: 'Fried Chicken',   price: 220, badge: null,  subtag: '温食', needs: ['sauce'] },
  { id: 'korokke',  emoji: '🥔', kana: 'コロッケ',    ja: 'コロッケ',         en: 'Croquette',       price: 150, badge: null,  subtag: '温食', needs: ['sauce'] },
  { id: 'sand',     emoji: '🥪', kana: 'サンド',      ja: 'ミックスサンド',   en: 'Mix Sandwich',    price: 280, badge: null,  subtag: 'パン', needs: [] },
  { id: 'melon',    emoji: '🍞', kana: 'メロンパン',  ja: 'メロンパン',       en: 'Melon Bread',     price: 180, badge: 'FAV', subtag: 'パン', needs: [] },
];

// === ドリンク(饮料)9 件 ===
export const DRINK_ITEMS = [
  { id: 'tea',      emoji: '🍵', kana: 'おちゃ',      ja: '生茶',             en: 'Green Tea',       price: 130, badge: null,  subtag: '冷', needs: [] },
  { id: 'coffee',   emoji: '☕', kana: 'コーヒー',    ja: 'コーヒー',         en: 'Coffee',          price: 110, badge: null,  subtag: '冷', needs: [] },
  { id: 'orange',   emoji: '🧃', kana: 'オレンジ',    ja: 'オレンジジュース', en: 'Orange Juice',    price: 160, badge: null,  subtag: '冷', needs: [] },
  { id: 'milk',     emoji: '🥛', kana: 'ぎゅうにゅう', ja: '牛乳',            en: 'Milk',            price: 150, badge: null,  subtag: '冷', needs: [] },
  { id: 'water',    emoji: '💧', kana: 'みず',        ja: 'ミネラルウォーター', en: 'Mineral Water',  price: 100, badge: null,  subtag: '冷', needs: [] },
  { id: 'soda',     emoji: '🥤', kana: 'ソーダ',      ja: 'ラムネ',           en: 'Ramune Soda',     price: 140, badge: null,  subtag: '冷', needs: [] },
  { id: 'yogurt',   emoji: '🥛', kana: 'のむヨーグルト', ja: 'のむヨーグルト', en: 'Yogurt Drink',    price: 140, badge: null,  subtag: '冷', needs: [] },
  { id: 'sports',   emoji: '🏃', kana: 'ポカリ',      ja: 'ポカリスエット',   en: 'Sports Drink',    price: 150, badge: 'HOT', subtag: '冷', needs: [] },
  { id: 'beer',     emoji: '🍺', kana: 'ビール',      ja: 'ビール',           en: 'Beer',            price: 250, badge: null,  subtag: '酒', needs: [] },
];

// === おやつ(零食杂货)9 件 ===
export const SNACK_ITEMS = [
  { id: 'pocky',    emoji: '🍫', kana: 'ポッキー',    ja: 'ポッキー',         en: 'Pocky',           price: 180, badge: null,  subtag: '菓子', needs: [] },
  { id: 'potato',   emoji: '🥔', kana: 'ポテチ',      ja: 'ポテトチップス',   en: 'Potato Chips',    price: 160, badge: null,  subtag: '菓子', needs: [] },
  { id: 'gum',      emoji: '🍬', kana: 'ガム',        ja: 'ガム',             en: 'Gum',             price: 100, badge: null,  subtag: '菓子', needs: [] },
  { id: 'pudding',  emoji: '🍮', kana: 'プリン',      ja: 'プリン',           en: 'Pudding',         price: 150, badge: null,  subtag: '甘味', needs: [] },
  { id: 'icecream', emoji: '🍦', kana: 'アイス',      ja: 'アイスクリーム',   en: 'Ice Cream',       price: 200, badge: 'FAV', subtag: '甘味', needs: [] },
  { id: 'donut',    emoji: '🍩', kana: 'ドーナツ',    ja: 'ドーナツ',         en: 'Donut',           price: 130, badge: null,  subtag: '甘味', needs: [] },
  { id: 'apple',    emoji: '🍎', kana: 'りんご',      ja: 'りんご',           en: 'Apple',           price: 180, badge: null,  subtag: '生鮮', needs: [] },
  { id: 'banana',   emoji: '🍌', kana: 'バナナ',      ja: 'バナナ',           en: 'Banana',          price: 100, badge: null,  subtag: '生鮮', needs: [] },
  { id: 'umbrella', emoji: '☂️', kana: 'かさ',        ja: 'ビニール傘',       en: 'Umbrella',        price: 500, badge: null,  subtag: '雑貨', needs: [] },
];

// === Tab 元数据 ===
export const TABS = [
  { key: 'food',  emoji: '🍱', label: 'フード',   items: FOOD_ITEMS },
  { key: 'drink', emoji: '🥤', label: 'ドリンク', items: DRINK_ITEMS },
  { key: 'snack', emoji: '🍪', label: 'おやつ',   items: SNACK_ITEMS },
];

// === 任务商品 id(3 件,checkout 激活条件) ===
export const TASK_ITEM_IDS = ['onigiri', 'chicken', 'tea'];

// === 所有商品合并(辅助用) ===
export const ALL_ITEMS = [...FOOD_ITEMS, ...DRINK_ITEMS, ...SNACK_ITEMS];
