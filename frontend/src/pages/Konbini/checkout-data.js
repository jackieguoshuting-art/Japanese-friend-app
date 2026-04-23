// Checkout 对话轮数定义
// instruction: (cart, total) => string 动态生成，根据购物车点名商品

function listItems(cart) {
  return cart.map(i => i.ja).join('、');
}

function itemsByNeed(cart, need) {
  return cart.filter(i => (i.needs || []).includes(need));
}

function joinItemNames(items) {
  return items.map(i => i.ja).join('と');
}

function listItemsWithLimit(cart, maxCount = 3) {
  if (!cart || cart.length === 0) return '';
  if (cart.length <= maxCount) return cart.map(i => i.ja).join('、');
  const first = cart.slice(0, maxCount).map(i => i.ja).join('、');
  return `${first}など`;
}

export const BASE_TURNS = [
  {
    id: 'greeting',
    auto: true,
    instruction: (cart, total) => `お客様が入店した。「いらっしゃいませ」と短く挨拶するだけ。他の内容は一切含めない。`,
    hints: [],
  },
  {
    id: 'review',
    auto: true,
    instruction: (cart, total) => {
      const shown = cart.slice(0, 3).map(i => i.ja).join('、');
      const suffix = cart.length > 3 ? 'など' : '';
      return `かごの商品を確認する。「${shown}${suffix}、以上でよろしいでしょうか?」と一言で確認する。商品名はこのリスト通りに読み上げ、追加も変更もしない。`;
    },
    hints: ['はい、お願いします', '他にもあります'],
  },
  {
    id: 'bag',
    auto: false,
    instruction: (cart, total) => '袋が必要か尋ねる。例:「袋はご利用になりますか?」',
    hints: ['袋お願いします', 'このままで大丈夫です'],
  },
  {
    id: 'point',
    auto: false,
    instruction: (cart, total) => 'ポイントカードの有無を尋ねる。例:「ポイントカードはお持ちですか?」',
    hints: ['持っています', '持っていません'],
  },
  {
    id: 'total',
    auto: false,
    instruction: (cart, total) => `合計金額と支払い方法を尋ねる。例:「お会計は¥${total}になります。お支払い方法は?」`,
    hints: ['現金で', 'カードで'],
  },
  {
    id: 'farewell',
    auto: false,
    instruction: (cart, total) => '会計完了の挨拶をして対話を終える。例:「ありがとうございました。またお越しくださいませ」',
    hints: [],
  },
];

export const ADDITIONAL_TURNS = {
  warm: {
    id: 'warm',
    auto: false,
    instruction: (cart, total) => {
      const items = itemsByNeed(cart, 'warm');
      const names = joinItemNames(items);
      return `${names}を温めるか尋ねる。必ず商品名を含める。例:「${names}は温めますか?」`;
    },
    hints: ['はい、温めてください', '冷たいままで大丈夫です'],
  },
  sauce: {
    id: 'sauce',
    auto: false,
    instruction: (cart, total) => {
      const items = itemsByNeed(cart, 'sauce');
      const names = joinItemNames(items);
      return `${names}にソースを付けるか尋ねる。必ず商品名を含める。例:「${names}にソースおつけしますか?」`;
    },
    hints: ['はい、お願いします', 'いりません'],
  },
  chopsticks: {
    id: 'chopsticks',
    auto: false,
    instruction: (cart, total) => {
      const items = itemsByNeed(cart, 'chopsticks');
      const names = joinItemNames(items);
      return `${names}にお箸を付けるか尋ねる。必ず商品名を含める。例:「${names}にお箸おつけしますか?」`;
    },
    hints: ['お箸お願いします', 'スプーンで'],
  },
};

// 根据购物车内容构建本次 checkout 的轮数数组
// cart: [{ id, ja, price, needs: [...] }, ...]
export function buildTurns(cart) {
  const needsSet = new Set();
  cart.forEach(item => {
    (item.needs || []).forEach(n => needsSet.add(n));
  });

  const additional = [];
  ['warm', 'sauce', 'chopsticks'].forEach(n => {
    if (needsSet.has(n)) additional.push(ADDITIONAL_TURNS[n]);
  });

  return [
    BASE_TURNS[0],          // greeting (auto)
    BASE_TURNS[1],          // review   (auto)
    ...additional,          // warm/sauce/chopsticks (0~3 轮)
    ...BASE_TURNS.slice(2), // bag, point, total, farewell
  ];
}
