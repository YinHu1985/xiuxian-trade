# 剧情事件体系总览

## 核心循环

```
触发点 → 事件对话(多步交替) → ①直接奖励(物品/灵石/船员)
                              → ②生成委托 → 完成委托(交货物) → 触发后续事件
                              → ③委托 + 后续事件链
```

## 设计注意事项

在编写新事件前，请务必阅读 [设计注意事项](design-notes.md)，了解 flag 管理、物品注册、正确/错误选择等关键规则。

## 对话设计

事件以**对话为主体**，遵循以下设计守则：

1. **对话为主、描述为辅** — 场景说明仅限开篇一句话。剧情通过角色对话推进，不使用大段旁白。
2. **交替对话** — 每次对话只有一人发言。利用 `portrait-left` / `portrait-right` 两种模式交替，展现两个人的交谈。每次发言 1~3 句，不超过 4 句。
3. **每步短小精悍** — 一个对话步只包含一个角色的发言 + 最多一个简短描述。快节奏推进，避免玩家一次性阅读过多文字。
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
| `arrive` | 到达节点时触发 | 据点剧情、探索发现 |
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
| `add_item` | `itemName` | 添加物品 |
| `remove_item` | `itemName` | 移除物品 |
| `add_cargo` | `productId` | 添加货仓商品 |
| `remove_cargo` | `productId` | 移除货仓商品 |
| `repair_airship` | — | 修复飞舟至满 |
| `damage_airship` | `amount` | 损坏飞舟 |
| `add_crew` | `amount` | 增加船员 |
| `remove_crew` | `amount` | 减少船员 |
| `set_prosperity` | `amount`, `flag`(节点ID) | 设置繁荣度 |
| `start_combat` | `flag`(战斗标记) | 触发战斗 |
| `add_quest` | 多字段 | 创建委托 |
| `acquire_map` | `ruinId?` | 获得遗迹地图 |
| `reveal_ruin_map` | — | 全图开启 |

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

## 事件分类

| 类别 | 文件 | 说明 |
|------|------|------|
| 设计注意事项 | [design-notes.md](design-notes.md) | flag、物品、选择等关键规则 |
| 小型事件 | [small-events.md](small-events.md) | 触发→选择→直接奖励，一锤子买卖 |
| 委托事件 | [quest-events.md](quest-events.md) | 触发→选择→生成委托→完成得奖励 |
| 事件链 | [event-chains.md](event-chains.md) | 多步串联，包含 flag 追踪和层层推进 |
