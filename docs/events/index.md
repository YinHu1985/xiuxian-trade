# 剧情事件体系总览

## 核心循环

```
触发点 → 事件对话(多步交替) → ①直接奖励(物品/灵石/船员)
                              → ②生成委托 → 完成委托(交物品) → 触发后续事件
                              → ③委托 + 后续事件链
```

## 架构约束：地图生成时预置 vs 事件动态放置

**重要设计原则：**

部分复杂事件的"物品放置"发生在**地图生成阶段**（`generator.ts`），而非事件触发时动态放置。
典型例子：`generateRelics()` 在生成时随机挑宗门→创遗失法宝→塞进遗迹→在宗门生成 quest。

实际数据流：

```
地图生成 (generator.ts)
  ├─ 随机选 2~3 个宗门，每个创一个 relic
  ├─ 将 relic 分配到一个随机遗迹的探索图中
  └─ 在宗门生成 relic 类型的 quest（status: 'available'）

玩家游玩
  ├─ 可能先探索遗迹 → 拿到 relic（awardRuinRelic 塞入背包）
  └─ 后访宗门 → 看到 quest（quest 本就存在，不是事件创建的）
```

**设计事件时必须注意：**

1. **已有物品优先** — 玩家可能在触发事件前就已持有目标物品（先探索、先交易等）。选项必须始终包含"我已经有了"直接交付的路径，避免玩家需要"接受委托→关闭→再点完成"的冗余操作。

2. **不要假设"事件→创建物品→探索发现→交任务"** — 正确的假设是"生成时已放置物品→发现物品→触发事件时可能已持有"。

3. **relic 类 quest 本身也是事件的一部分** — 如果设计了一个 `arrive·宗门` 事件来处理 relic 任务，
   该事件的选项里就要包含"已有 relic 则直接交"的路径，而不是依赖 quest 列表的默认弹窗。

### 已有物品选项的设计规范

| 场景 | 选项示例 | 条件 | 结果 |
|------|---------|------|------|
| 委托需采购货物 | 「你要的灵材我碰巧就有」 | 货仓有对应产物 | 直接交付，奖励减半 |
| 委托需特定物品 | 「你说的东西我手上刚好有」 | 背包有对应物品 | 直接交付，奖励适中 |
| 委托需法宝/遗物 | 「我已寻回贵派法宝」 | 背包有对应 relic | 委托+完成一步到位 |
| 被劫货物 | 「我正好有类似的，卖给你？」 | 货仓有对应商品 | 直接交易 |

事件以**对话为主体**，遵循以下设计守则：

1. **对话为主、描述为辅** — 场景说明仅限开篇一句话。剧情通过角色对话推进，不使用大段旁白。
2. **交替对话** — 每次对话只有一人发言。利用 `portrait-left` / `portrait-right` 两种模式交替，
   展现两个人的交谈。每次发言 1~3 句，不超过 4 句。
3. **每步短小精悍** — 一个对话步只包含一个角色的发言 + 最多一个简短描述。
   快节奏推进，避免玩家一次性阅读过多文字。
4. **选择在末尾** — 多步对话铺垫后，在最后一步给出选项（而非每一句都选）。

### 对话模板

```
步 1: portrait-right — NPC 说话
步 2: portrait-left  — 会长/助理回应
步 3: portrait-right — NPC 补充/解释
步 4: 选择（NPC 问玩家）
```

## 触发方式

| 触发类型 | 说明 | 使用场景 |
|---------|------|---------|
| `init` | 游戏开局时触发 | 新手引导 |
| `arrive` | 到达节点/访问界面时触发 | 据点剧情、探索发现 |
| `turn_end` | 每回合结束时触发 | 随机遭遇、周期事件 |
| `action` | 特定操作时触发 | 引导步骤、手动启动 |
| `quest_complete` | 委托完成时触发 | 委托后续剧情 |
| `battle_end` | 战斗结束时触发 | 战斗剧情 |

## 条件系统

事件通过 `EventCondition` 控制触发条件：

```typescript
条件 = {
  flagsRequired?: string[]    // 需要哪些旗帜已设
  flagsBlocked?: string[]     // 需要哪些旗帜未设
  itemsRequired?: string[]    // 需要背包中有哪些物品
  cargoRequired?: string[]    // 需要货仓中有哪些商品
  spiritStoneMin?: number     // 灵石下限
  spiritStoneMax?: number     // 灵石上限
  turnMin?: number            // 回合下限
  turnMax?: number            // 回合上限
  nodeType?: NodeType         // 当前节点类型
  nodeId?: string             // 当前节点 ID
  randomChance?: number       // 随机概率 (0~1)
}
```

## 效果系统

事件步骤和选项通过 `EventEffect` 产生实际影响。

当前支持的效果类型：

| 效果类型 | 参数 | 说明 |
|---------|------|------|
| `set_flag` | `flag` | 设置旗帜 |
| `clear_flag` | `flag` | 清除旗帜 |
| `add_spirit_stone` | `amount` | 增加灵石 |
| `remove_spirit_stone` | `amount` | 减少灵石 |
| `add_item` | `itemName` | 添加物品（可堆叠） |
| `remove_item` | `itemName` | 移除物品 |
| `add_cargo` | `productId`, `amount`(价格) | 添加货仓商品 |
| `remove_cargo` | `productId` | 移除货仓商品 |
| `repair_airship` | — | 修复飞舟至满 |
| `damage_airship` | `amount` | 损坏飞舟 |
| `add_crew` | `amount` | 增加船员 |
| `remove_crew` | `amount` | 减少船员 |
| `set_prosperity` | `amount`, `flag`(节点ID) | 设置繁荣度 |
| `start_combat` | `flag`(战斗标记) | 触发战斗 |
| `add_quest` | `questTitle`, `questType`, `questDesc`, `productId`, `questReward` | 创建委托 |

## 委托系统

事件可通过 `add_quest` 效果创建委托。委托类型:

| 委托类型 | 完成条件 | 适用场景 |
|---------|---------|---------|
| `purchase` | 玩家货仓中有指定商品 (`productId`) | 采购任务 |
| `deliver` | 玩家背包中有指定信件物品 (`targetNodeId`) | 送信任务 |
| `trade` (buy) | 玩家背包中有指定天材地宝 (`productId`) | 出售给NPC |

## 数据流

```
[游戏引擎]                  [事件引擎]                    [UI]
    │                          │                          │
    ├─ arrive/action ─────────→  checkEvents() ──────────→  DialogWindow
    │                          │  (筛选可用事件)             (渲染对话)
    │                          │                          │
    │                          │  advanceEvent(choice) ←── 用户选择
    │                          │  (执行效果、推进步骤)        │
    │                          │                          │
    ├─ quest_complete ────────→  checkEvents() ──────────→  DialogWindow
    │  (委托被完成)              (触发后续事件)               │
    │                          │                          │
    ├─ turn_end ──────────────→  checkEvents() ──────────→  DialogWindow
    │  (回合结束)                (随机遭遇)                  │
    │                          │                          │
    └──────────────────────────┘                          └──
```

## 实现状态

| 功能 | 状态 |
|------|------|
| 事件条件（flag、物品、回合、节点类型等） | ✅ 已实现 |
| 事件效果（flag、灵石、物品、船员、飞舟等） | ✅ 已实现 |
| `add_quest` 效果类型 | ✅ 已实现 |
| `turn_end` 触发钩子 | ✅ 已实现 |
| `quest_complete` 触发钩子 | ✅ 已实现 |
| `action` 触发的事件筛选（actionType 过滤） | ✅ 已实现 |
| 委托系统（接取、完成、检查物品） | ✅ 已实现 |
| 立绘缺失 fallback（对话仍可触发，仅不显示图片） | ✅ 已实现 |

## 事件分类

| 类别 | 文件 | 说明 |
|------|------|------|
| 小型事件 | [small-events.md](small-events.md) | 触发→选择→直接奖励，一锤子买卖 |
| 委托事件 | [quest-events.md](quest-events.md) | 触发→选择→生成委托→完成得奖励 |
| 事件链 | [event-chains.md](event-chains.md) | 多步串联，包含 flag 追踪和层层推进 |
