// Checkout 对话轮数定义
// BASE_TURNS: 固定顺序(greeting 在开头,bag/point/total/farewell 在末尾)
// ADDITIONAL_TURNS: 根据购物车 needs 动态插入(顺序固定 warm→sauce→chopsticks)

export const BASE_TURNS = [
  {
    id: 'greeting',
    auto: true,
    instruction: 'お客様が入店した。「いらっしゃいませ」と一言だけ挨拶する。',
    hints: [],
  },
  {
    id: 'bag',
    auto: false,
    instruction: '袋が必要か丁寧に尋ねる。例:「袋はご利用になりますか?」',
    hints: ['はい、お願いします', 'いいえ、大丈夫です'],
  },
  {
    id: 'point',
    auto: false,
    instruction: 'ポイントカードの有無を尋ねる。例:「ポイントカードはお持ちですか?」',
    hints: ['持っていません', 'あります'],
  },
  {
    id: 'total',
    auto: false,
    instruction: '合計金額を告げる。合計は ¥${total}。例:「お会計は○○円になります」',
    hints: ['はい、お願いします'],
  },
  {
    id: 'farewell',
    auto: false,
    instruction: '会計完了の挨拶をして対話を終える。例:「ありがとうございました。またお越しくださいませ」',
    hints: [],
  },
];

export const ADDITIONAL_TURNS = {
  warm: {
    id: 'warm',
    auto: false,
    instruction: '温める必要があるか尋ねる。例:「温めますか?」',
    hints: ['はい、お願いします', 'いいえ、大丈夫です'],
  },
  sauce: {
    id: 'sauce',
    auto: false,
    instruction: 'ソースを付けるか尋ねる。例:「ソースおつけしますか?」',
    hints: ['はい', '要りません'],
  },
  chopsticks: {
    id: 'chopsticks',
    auto: false,
    instruction: '箸を付けるか尋ねる。例:「お箸おつけしますか?」',
    hints: ['お願いします', '要りません'],
  },
};

// 根据购物车内容构建本次 checkout 的轮数数组
// cart: [{ id, needs: ['warm', ...] }, ...]
// 返回 5~8 个 turn 对象
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
    BASE_TURNS[0],          // greeting
    ...additional,          // warm/sauce/chopsticks (0~3 轮)
    ...BASE_TURNS.slice(1), // bag, point, total, farewell
  ];
}
