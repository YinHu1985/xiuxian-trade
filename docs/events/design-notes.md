# 事件系统设计注意事项

## 1. flag 管理

### 1.1 有设必有查

- 每个 `set_flag` 的效果必须有对应的 `flagsRequired` 或 `flagsBlocked` 在后续事件中引用
- 否则称为"孤儿 flag"，既占空间又制造混乱
- 定期审计：搜索所有 `set_flag` → 检查是否有事件的条件 `flagsRequired`/`flagsBlocked` 引用该 flag

### 1.2 flag 命名规范

- `{chain_id}_{step}_{action}` — 如 `chain_b_trap_discovered`
- `{chain_id}_{step}_done` — 步骤完成标记，如 `chain_c_trial_1_done`
- 避免通用名（如 `started`、`done` 需加前缀）

## 2. 链式事件的顺序控制

### 2.1 必须用 `flagsRequired` 锁顺序

链式事件的每一步必须通过 `flagsRequired` 要求前一步完成，否则事件可能在任意顺序触发。

错误示例：
```typescript
// 没有 flagsRequired，只要有令牌就能触发任意试炼
condition: { itemsRequired: ['试炼令牌'], flagsBlocked: ['chain_c_trial_X_done'] }
```

正确示例：
```typescript
// C3 必须等 C2 正确通过后才能触发
condition: { flagsRequired: ['chain_c_trial_1_done'], itemsRequired: ['试炼令牌'], ... }
```

### 2.2 正确/错误选择设计

- 每个关键步骤应只有一个"正确"选择，其他为"错误"选择
- 正确选择：设 `_done` flag，解锁下一步
- 错误选择：消耗资源，**不设** `_done` flag
- 事件 `repeatable: false` — 选了就定，不能重试
- 自动 `eventId_done` 锁死事件，即使选错也无法再触发

```
事件触发 → 错误选择(扣资源, 不设flag) → eventId_done锁死 → 链断
         → 正确选择(设flag) → 下一步解锁
```

### 2.3 断链设计

若某个选择应为"链断"，只需**不设**后续步骤所需的 flag。事件自身的 `repeatable: false` + 自动 `eventId_done` 足够锁死。

## 3. 物品系统

### 3.1 必须先在 `itemDefinitions` 中注册

事件中使用的所有物品（`add_item` / `remove_item` / `itemsRequired`）必须在 `data.ts` 的 `itemDefinitions` 中注册。

### 3.2 物品分类

- **PlayerItem**（背包物品）：天材地宝、关键道具 → `add_item` / `remove_item`
- **Cargo**（货仓商品）：市场交易品 → 通过 `purchase` 类型委托处理
- 不要把 PlayerItem 当作 `purchase` 委托的 `productId`

### 3.3 无用物品的判定

仅用于某一事件内一次性奖励、之后再无引用的物品应被移除或替换为灵石/船员等通用资源。

### 3.4 物品命名约定

- `itemDefinitions` 的 `id` 用 kebab-case 前缀：`treasure-`（天材地宝）、`item-`（功能道具）、`quest-`（任务道具）
- `name` 为中文显示名，事件中通过 `itemName` 引用

```typescript
{ id: 'item-formation-pearl', name: '破阵珠', stackable: true }
// 事件中用 add_item itemName: '破阵珠'
```

## 4. 委托系统

### 4.1 委托类型选择

| 类型 | 适用场景 | 关键字段 |
|------|---------|---------|
| `purchase` | 采购某种货仓商品 | `productId`（须为 `productMap` 中的有效 ID）|
| `deliver` | 送信/送达某据点 | `questTargetNodeId`（可留空，引擎自动随机分配）|
| `trade` | 用 PlayerItem 交易 | N/A |

### 4.2 `deliver` 委托的目标节点

- 若不确定目标节点，可以留 `questTargetNodeId: ''`（空字符串）
- 引擎在 `add_quest` 效果中会自动从世界节点中随机选一个（非当前据点）
- 无需在事件定义中硬编码目标

### 4.3 `productId` 必须有效

`purchase` 类型的 `productId` 必须是 `productMap` 中存在的键。格式为 `{category}-{realm}`，如：
- `herb-qi`（炼气药材）
- `herb-foundation`（筑基药材）
- `herb-golden`（金丹药材）
- `ore-golden`（金丹金石）

### 4.4 委托状态

`add_quest` 效果创建的委托直接为 `'active'` 状态，无需玩家手动领取。

## 5. 选项效果描述

- 选项按钮上需显示效果预览，由 `formatEffectPreview` 自动解析 `effects` 数组生成
- `add_quest` 效果预览为"接取委托"
- `acquire_map` → "获得遗迹地图"
- `reveal_ruin_map` → "全图开启"

## 6. 触发条件

### 6.1 arrive 事件通过分发器分配

- `arrive` 事件在生成器（`generator.ts`）中通过 `distributeEvents` 分配到具体节点
- 定义时仍需保留 `nodeType` 和 `randomChance` 用于分发器的匹配
- 分发后副本的 `nodeType`/`randomChance` 被清空，改为具体 `nodeId`

### 6.2 非 arrive 事件使用全局条件

- `turn_end`、`action`、`init`、`quest_complete`、`battle_end` 等触发类型保持全局随机
- 通过 `randomChance`、`turnMin`/`turnMax`、`excludeStartingNode` 控制触发概率

## 7. 常见错误 checklist

- [ ] flag 是否设置了却在后续无引用？（孤儿 flag）
- [ ] 链式事件是否缺了 `flagsRequired` 顺序锁？
- [ ] 选项是否"任何选择都过"？正确选择才应设 `_done` flag
- [ ] 错误选择是否设置了 `_done` flag？（不应该设）
- [ ] 物品是否在 `itemDefinitions` 中注册？
- [ ] `productId` 是否在 `productMap` 中存在？
- [ ] 无用的一次性物品是否已替换为灵石/船员？
- [ ] 交付委托的 `questTargetNodeId` 是否留空或有效？
- [ ] `add_quest` 效果是否缺少必要字段（`questTitle` / `questType` / `questReward`）？
