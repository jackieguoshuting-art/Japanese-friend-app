# Konbini(便利店)

路由:`#pg-konbini`
入口:Scene 地图 → minimart 热点 popup → ENTER(里程碑 3 接通)

## 文件结构

- Konbini.js — 主入口、stage 切换、全局状态
- data.js — 3 大类 × 9 件商品 + Tab 元数据 + TASK_ITEM_IDS
- shopping.js — Stage 1 Tab + 货架 + 购物车
- checkout.js — Stage 2 对话结账
- summary.js — Stage 3 receipt + 积分

## 状态机

3 stage 用 `#pg-konbini[data-stage="..."]` CSS 作用域切换:
- `shopping` → `checkout` → `summary`

## 商品分类

3 个 Tab,每 Tab 9 件,一页 3×3 不翻页:
- 🍱 フード(食物):9 件,含任务商品 onigiri / chicken
- 🥤 ドリンク(饮料):9 件,含任务商品 tea
- 🍪 おやつ(零食杂货):9 件,无任务商品

## 里程碑进度

- [x] 1a:架子 + Design Tokens + 路由 + 27 件商品数据
- [ ] 1b:Tab + 货架 + 洗牌 + 品切れ + 购物车 + レジへ
- [ ] 2 :对话结账
- [ ] 3 :Summary + Scene 联通
