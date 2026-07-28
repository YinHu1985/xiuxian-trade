# 修仙贸易 — 游戏架构文档

## 项目概览

修仙贸易（xiuxian-trade）是一款基于 React 18 + TypeScript + Vite 的回合制修仙商会经营游戏。

### 技术栈

| 层 | 技术 |
|--|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS + 内联类 |
| 持久化 | localStorage (JSON) |

### 目录结构

```
src/
├── game/              # 纯逻辑层（无 UI 依赖）
│   ├── types.ts       # 全部类型定义
│   ├── config.ts      # 游戏配置参数（默认值 + 预设）
│   ├── data.ts        # 商品/物品数据
│   ├── generator.ts   # 地图与初始状态生成
│   ├── engine.ts      # 核心玩法逻辑
│   ├── eventEngine.ts # 剧情事件引擎
│   ├── battle.ts      # 战斗系统
│   ├── save.ts        # 存档/读档
│   ├── storyEvents.ts # [已废弃] 旧事件标记系统
│   ├── backgrounds.ts # 背景图配置
│   ├── sound.ts       # 音效
│   └── events/        # 事件定义文件
│       ├── registry.ts      # 事件注册表（懒加载）
│       ├── introEvents.ts   # 开局引导事件
│       ├── airshipEvents.ts # 飞舟引导事件
│       └── mapEvents.ts     # 地图引导事件
├── pages/             # 页面级组件
│   ├── Home.tsx       # 首页（空壳）
│   ├── NewGamePage.tsx# 新建游戏（预设选择+起名）
│   ├── MainGamePage.tsx# 核心游戏页面（~2400 行）
│   └── SavesPage.tsx  # 存档管理页
├── components/        # 可复用 UI 组件
│   ├── TopBar.tsx     # 全局 HUD（导航+过回合）
│   ├── MapPanel.tsx   # 地图显示组件
│   ├── NodeSidebar.tsx# 据点详情侧栏
│   ├── GuildSidebar.tsx# 商会总览侧栏
│   ├── SettingsPanel.tsx# 设置面板
│   └── Empty.tsx      # 占位组件
├── store/
│   └── gameStore.ts   # Zustand 全局状态
├── hooks/             # 自定义 hooks
├── lib/               # 工具函数
├── index.css          # 全局样式
├── App.tsx            # 路由/页面切换
└── main.tsx           # 入口
```

---

## 核心数据结构

以 `GameSession` 为根：

```typescript
interface GameSession {
  version: number           // 存档版本
  config: GameConfig        // 游戏配置
  world: WorldState         // 世界状态
  player: PlayerState       // 玩家状态
  guild: GuildState         // 商会状态
  storyFlags: Record<string, boolean>  // 剧情标记
}
```

### WorldState

```typescript
interface WorldState {
  seed: number
  currentTurn: number
  maxTurns: number
  nodes: NodeState[]          // 地图节点
  edges: EdgeState[]          // 节点间道路
  selectedNodeId: string
  pendingPlan?: TurnPlanState // 待执行计划
  pendingEvent?: PendingEvent // 待推进的剧情事件
  generatedEvents: StoryEvent[] // 程序生成的事件
  logs: string[]              // 事件日志
  finalObjectiveUnlocked: boolean
  finalObjectiveCompleted: boolean
  ending?: EndingState
}
```

### NodeState（每个据点）

```typescript
interface NodeState {
  id: string                  // "node-0" ~ "node-N"
  name: string                // 中文名
  type: NodeType              // 'town' | 'sect' | 'ruin' | 'special'
  x, y: number                // 地图坐标 0~100
  prosperity?: number         // 仅城镇有，1~5
  discovery: DiscoveryState   // 'hidden' | 'rumor' | 'confirmed'
  knownProducts: boolean
  baseProducts: string[]      // 本地特产 ID 列表
  inventory: Record<string, InventoryEntry>
  market: MarketModifierState
  branchId?: string           // 分号 ID（已设立时）
  reputation: number          // 本地声望 -200~+200（新增）
}
```

### PlayerState

```typescript
interface PlayerState {
  currentNodeId: string
  spiritStone: number
  moveRange: number
  cargoCapacity: number
  cargo: CargoItem[]
  items: PlayerItem[]
  tradeLinkCapacity: number
  retainerCapacity: number
  airshipDurability / maxDurability: number
  airshipCrew / maxCrew: number
}
```

### GuildState

```typescript
interface GuildState {
  name: string
  branches: BranchState[]       // 分号列表
  buildings: BuildingState[]     // 建筑（升级）
  tradeLinks: TradeLinkState[]   // 商路
  retainers: RetainerState[]     // 供奉
  quests: QuestState[]           // 委托
  reputation: number
}
```

---

## 页面路由

由 `App.tsx` 管理，通过 `onNavigate` prop 下发：

| 页面 | 路径 | 职责 |
|------|------|------|
| `Home` | '/' | 空壳首页 |
| `NewGamePage` | 'newGame' | 选预设、起名、开局 |
| `MainGamePage` | 'game' | 核心游戏循环 |
| `SavesPage` | 'saves' | 存档管理/导入导出 |

`MainGamePage` 内部通过 `mainView` 状态切换三个子视图：
- `'town'` — 当前据点场景（驻留界面）
- `'airship'` — 飞舟总览
- `'map'` — 大地图

### 主要 UI 组件（MainGamePage 内）

```
MainGamePage
├── TopBar                    # 全局 HUD
├── TownStage                 # 城镇/据点视图
│   ├── TownSidebar           # 据点详情面板
│   ├── TavernWindow          # 酒楼/营地
│   ├── MarketWindow          # 交易所
│   ├── ManorWindow           # 城主府/商会
│   └── BranchWindow          # 分号管理
├── AirshipStage              # 飞舟视图
│   └── AirshipSidebar        # 飞舟详情
├── MapStage                  # 地图视图
│   ├── MapPanel              # 地图渲染
│   ├── TradeLinkPanel        # 商路管理
│   └── (选中据点操作面板)
├── BattleModal               # 战斗弹窗
├── DialogWindow              # 剧情对话弹窗
├── TurnAdvanceOverlay        # 过回合动画
├── SettingsWindow            # 设置/存档弹窗
│   ├── SettingsWindowTabOptions
│   └── SettingsWindowTabSaves
├── FloatingPanel             # 可移动面板容器
└── CompactPanel              # 紧凑面板容器
```

---

## 游戏循环（一回合流程）

1. **计划阶段** — 玩家自由操作：
   - 在据点间移动（`scheduleTravel`）
   - 买卖商品（`buyProduct` / `sellCargo`）
   - 接取/完成委托（`acceptQuest` / `completeQuest`）
   - 打听传闻（`tavernRumor`）
   - 建立分号/商路/建筑（`establishBranch` / `createTradeLink` / `scheduleConstruction`）
   - 升级飞舟（`increaseCargoCapacity` / `increaseMoveRange` 等）

2. **执行阶段** — `executePendingPlan()`：
   - 执行移动（到达触发 `'arrive'` 事件检查）
   - 触发过回合结算（收入、供奉等）
   - 检查 `'turn_end'` 事件
   - 推进回合数

3. **事件阶段** — 可在任何阶段通过事件系统插入：
   - 到达触发 → `checkEvents('arrive', session)`
   - 界面操作触发 → `checkEvents('action', session, { actionType })`
   - 战斗结束触发（需 hook 确认）

---

## 剧情事件系统

### 事件数据结构

```typescript
interface StoryEvent {
  id: string                  // 唯一 ID，如 "intro_01"
  title?: string              // 事件名称
  trigger: TriggerType        // 'arrive' | 'turn_end' | 'quest_complete' | 'battle_end' | 'init' | 'action'
  triggerFilter?: {           // 额外筛选
    nodeType?: NodeType
    battleResult?: 'win' | 'lose'
    actionType?: string       // 动作触发时匹配
  }
  condition: EventCondition   // 触发条件
  priority: number            // 优先级（高优先触发）
  repeatable: boolean         // 是否可重复
  flagOnStart?: string        // 开始时设置的 flag（防重复触发）
  steps: StoryStep[]          // 对话步骤
  onComplete?: EventEffect[]  // 完成时执行的效果
}
```

### 触发方式

| 方式 | API | 说明 |
|------|-----|------|
| 自动检测 | `checkEvents(trigger, session, context?)` | 按 trigger 自动匹配最高优先级事件 |
| 手动启动 | `tryStartEvent(eventId, session)` | 按 ID 直接启动（用于视图切换等场景） |
| 动作触发 | `checkEvents('action', session, { actionType })` | 按动作类型筛选（新增） |

### 事件引擎流程

```
checkEvents → getAvailableEvents → 筛选 → 排序 → 取最高优先级 → 设 pendingEvent → 返回第一步
advanceEvent → 执行当前步骤效果 → 推进步骤 → 重复直到结束 → 执行 onComplete → 清 pendingEvent
```

### 条件系统 (EventCondition)

- `flagsRequired` / `flagsBlocked` — 基于 storyFlags
- `itemsRequired` / `cargoRequired` — 物品/货物
- `spiritStoneMin/Max`, `turnMin/Max` — 数值门槛
- `nodeType`, `nodeId` — 据点筛选
- `randomChance` — 概率触发

### 效果系统 (EventEffect)

支持：设置/清除 flag、增减灵石、增删物品/货物、修理/损坏飞舟、增减船员、设置繁荣度、标记战斗开始

### 事件注册

- 静态事件：定义在 `src/game/events/*.ts`，通过 `registry.ts` 懒加载合并
- 动态事件：通过 `registerGeneratedEvents(session, events)` 加入 `world.generatedEvents`

### 当前已注册事件

| ID | 触发 | 说明 |
|----|------|------|
| intro_01 | init | 开局引导·开拓许可 |
| intro_02 | init (flagsRequired: intro_01_done) | 开局引导·城镇一览 |
| intro_03 | init (flagsRequired: intro_02_done) | 开局引导·启程资金 |
| intro_airship | action/arrive | 飞舟总览引导 |
| intro_map | action/arrive | 大地图指南 |

---

## 声望系统（本次新增）

- 每个据点独立 `reputation`，范围 -200~+200
- 完成任务：`node.reputation += quest.difficulty`，上限 +200
- `QuestState` 新增 `minReputation?: number` 作为接取门槛
- 当前随机任务全部 `minReputation: 0`，无影响
- UI 在三个据点面板显示 "本地声望"

---

## 贸易与经济系统

### 商品

每种商品有：`id`, `name`, `category`, `realm`, `basePrice`, `sourceBias`

### 特产来源

1. **原产** — 据点自带，直接进入交易所
2. **采集** — 邻居据点的原产产物（仅算有/无）
3. **工坊** — 建筑提供的派生商品（仅算有/无）
4. **商路** — 对端本地产物（仅参与收入计算，不进入交易所）

### 收入

- `baseIncomePerProduct × 本地特产种类数 × (1 + 繁荣度加成)`
- 商路额外带入对端本地产物参与计算

### 交易所

- 每种特产每回合固定 1 仓
- 价格受 modifer 波动（买卖会压低/推高）
- 支持计划买卖模式（计划→确认→结算）

---

## 存档系统

- 存储格式：`localStorage` + JSON
- 索引键：`xiuxian-trade-save-index`（存储 SaveMeta 列表）
- 存档键：`xiuxian-trade-save:{uuid}`
- 最大存档数：12
- 每次存档会序列化整个 `GameSession`
- `SaveMeta` 包含：`id`, `title`, `savedAt`, `turn`, `spiritStone`, `exploredNodes`
- 支持 JSON 导入/导出

---

## 战斗系统

- 3×3 九宫格站位
- 前后中三排，上中下三路
- 自动战斗（不可手动操作）
- 通过 `battle_end` trigger 可与事件系统衔接（需确认 hook 是否已接入）

---

## 待办 / 已知问题

详见 [主线星盘碎片设计](./主线星盘碎片设计.md) 的待办清单。

关键未完成项：
- [ ] 确认 `battle_end` trigger 在战斗结算中是否已正确 hook
- [ ] `EventCondition` 新增 `minBranchIncome` 支持商会收入门槛
- [ ] 商会累计收入追踪（`accumulatedBranchIncome`）
- [ ] 任务追踪/主线进度 UI
- [ ] 宗门/遗迹差异化交互设计
- [ ] 星盘碎片四条支线的具体事件定义
