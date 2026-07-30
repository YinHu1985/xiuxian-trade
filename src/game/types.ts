export type NodeType = 'town' | 'sect' | 'ruin' | 'special'
export type DiscoveryState = 'hidden' | 'rumor' | 'confirmed'
export type ProductCategory = 'herb' | 'ore' | 'pelt' | 'essence' | 'talisman' | 'elixir' | 'equipment'
export type Realm = 'qi' | 'foundation' | 'golden' | 'nascent'
export type BuildingType = 'hub' | 'alchemy' | 'forge' | 'sigil' | 'auction'
export type RetainerStatus = 'idle' | 'busy' | 'trade'
export type RuinObstacleType = 'formation' | 'poison' | 'sword' | 'none'
export type SectSaleItem = 'item-golden-armor' | 'item-poison-pill' | 'item-formation-pearl'
export type TurnPlanType = 'travel' | 'retainer' | 'repair-gate' | 'building'

export interface ProductDefinition {
  id: string
  name: string
  category: ProductCategory
  realm: Realm
  basePrice: number
  sourceBias: NodeType[]
}

export interface InventoryEntry {
  quantity: number
  max: number
}

export interface MarketModifierState {
  categories: Record<ProductCategory, number>
}

export interface RuinExplorationNode {
  id: string
  layer: number
  position: number
  obstacle: RuinObstacleType
  difficulty: number
}

export interface RuinExplorationEdge {
  fromId: string
  toId: string
}

export interface RuinExplorationState {
  nodes: RuinExplorationNode[]
  edges: RuinExplorationEdge[]
  currentPos: 'entrance' | string | 'destination'
  attemptActive: boolean
  completed: boolean
  revealed: string[]
  passed: string[]
  pendingNodeId?: string
  /** 引擎层瞬态标记：本次探索刚完成时设置，用于 UI 弹出遗物提示 */
  _pendingRelicPopup?: { relicName: string; isFirstTime: boolean } | null
}

export interface NodeState {
  id: string
  name: string
  type: NodeType
  x: number
  y: number
  prosperity?: number
  discovery: DiscoveryState
  knownProducts: boolean
  baseProducts: string[]
  inventory: Record<string, InventoryEntry>
  market: MarketModifierState
  branchId?: string
  reputation: number
  ruinExploration?: RuinExplorationState
  relicData?: { itemName: string; flagPrefix: string }
}

export interface EdgeState {
  id: string
  fromNodeId: string
  toNodeId: string
  discovery: DiscoveryState
  familiarityLevel: number
  baseTravelCost: number
}

export interface CargoItem {
  id: string
  productId: string
  purchasedAtNodeId: string
  cost: number
}

export type QuestType = 'purchase' | 'deliver' | 'trade'

export interface PlayerItem {
  id: string
  name: string
  stackable: boolean
  count: number
  data?: Record<string, string>
}

export interface QuestState {
  id: string
  type: QuestType
  nodeId: string
  npcName: string
  title: string
  intro: string
  acceptPrompt: string
  completePrompt: string
  reward: number
  status: 'available' | 'active' | 'completed'
  productId?: string
  count?: number
  targetNodeId?: string
  letterItemId?: string
  tradeAction?: 'buy' | 'sell'
  minReputation?: number
  difficulty: number
}

export interface BuildingState {
  id: string
  type: BuildingType
  level: number
  enabled: boolean
}

export interface BranchState {
  id: string
  nodeId: string
  buildingIds: string[]
}

export interface TradeLinkState {
  id: string
  fromNodeId: string
  toNodeId: string
  maintenanceCost: number
}

export interface RetainerState {
  id: string
  name: string
  status: RetainerStatus
  remainingTurns: number
  targetNodeId?: string
}

export interface TurnPlanState {
  type: TurnPlanType
  targetNodeId?: string
  buildingType?: BuildingType
}

export interface PlayerState {
  currentNodeId: string
  spiritStone: number
  moveRange: number
  cargoCapacity: number
  cargo: CargoItem[]
  items: PlayerItem[]
  retainerCapacity: number
  airshipDurability: number
  airshipMaxDurability: number
  airshipCrew: number
  airshipMaxCrew: number
}

export interface GuildState {
  name: string
  branches: BranchState[]
  buildings: BuildingState[]
  tradeLinks: TradeLinkState[]
  retainers: RetainerState[]
  quests: QuestState[]
  reputation: number  // TODO: 预留字段，后续会接入声望系统
}

export interface WorldState {
  seed: number
  currentTurn: number
  maxTurns: number
  nodes: NodeState[]
  edges: EdgeState[]
  selectedNodeId: string
  startingNodeId: string
  pendingPlan?: TurnPlanState
  pendingEvent?: PendingEvent
  pendingBattleEventId?: string  // start_combat 效果触发时记录事件 ID，用于战斗结束后的 battle_end hook
  generatedEvents: StoryEvent[]
  logs: string[]
  finalObjectiveUnlocked: boolean
  finalObjectiveCompleted: boolean
  lastMoveRangeUpgradeUnlocked: boolean  // TODO: 暂无解锁途径，后续会加
  ending?: EndingState
  /** 仍可获取的遗迹地图对应的遗迹 nodeId 列表 */
  ruinMapsAvailable: string[]
}

export interface EndingState {
  title: string
  summary: string
  totalScore: number
  scores: {
    exploration: number
    commerce: number
    network: number
    capital: number
  }
  failed: boolean
}

export interface MapConfig {
  nodeCount: number
  townRatio: number
  sectRatio: number
  ruinRatio: number
  specialRatio: number
  knownNeighborCount: number
  averageConnections: number
  hubBias: number
}

export interface ProgressConfig {
  maxTurns: number
  initialMoveRange: number
  initialSpiritStone: number
  cargoCapacity: number
  startingRetainerCapacity: number
  finalObjectiveProsperityThreshold: number
}

export interface EconomyConfig {
  originDiscount: number
  baseIncomePerProduct: number
  auctionBonus: number
  tradeLinkMaintenance: number
  retainerUpgradeBaseCost: number
  cargoUpgradeBaseCost: number
  moveRangeUpgradeBaseCost: number
  repairAirshipCost: number
  recruitCrewCost: number
}

export interface MarketConfig {
  minModifier: number
  maxModifier: number
  tradeImpactPerUnit: number
  modifierRecoveryPerTurn: number
  baseTravelCost: number
  familiarityMax: number
  familiarityGainPerTravel: number
}

export interface ExplorationConfig {
  tavernRumorCost: number
  tavernSuccessRate: number
}

export interface GameConfig {
  map: MapConfig
  progress: ProgressConfig
  economy: EconomyConfig
  market: MarketConfig
  exploration: ExplorationConfig
}

export interface GameSession {
  version: number
  config: GameConfig
  world: WorldState
  player: PlayerState
  guild: GuildState
  storyFlags: Record<string, boolean>
}

/* ====================== 剧情事件系统 ====================== */

export type DialogMode = 'plain' | 'inline-image' | 'portrait-left' | 'portrait-right'

export type TriggerType = 'arrive' | 'turn_end' | 'quest_complete' | 'battle_end' | 'init' | 'action'

export interface EventCondition {
  flagsRequired?: string[]
  flagsBlocked?: string[]
  itemsRequired?: string[]
  cargoRequired?: string[]
  spiritStoneMin?: number
  spiritStoneMax?: number
  turnMin?: number
  turnMax?: number
  nodeType?: NodeType
  nodeId?: string
  nodeIdBlocked?: string[]
  /** 为 true 时，在起始据点不触发 */
  excludeStartingNode?: boolean
  randomChance?: number
}

export interface EventEffect {
  type:
    | 'set_flag'
    | 'clear_flag'
    | 'add_spirit_stone'
    | 'remove_spirit_stone'
    | 'add_item'
    | 'remove_item'
    | 'add_cargo'
    | 'remove_cargo'
    | 'repair_airship'
    | 'damage_airship'
    | 'add_crew'
    | 'remove_crew'
    | 'set_prosperity'
    | 'start_combat'
    | 'add_quest'
    | 'acquire_map'
    | 'reveal_ruin_map'
  flag?: string
  amount?: number
  itemName?: string
  productId?: string
  // add_quest 专用字段
  questTitle?: string
  questDesc?: string
  questType?: string
  questTargetNodeId?: string
  questReward?: number
  questDifficulty?: number
  questCompletePrompt?: string
  // acquire_map 专用字段：指定遗迹 nodeId，不指定则随机从 ruinMapsAvailable 取一个
  ruinId?: string
}

export interface StoryChoice {
  label: string
  effects?: EventEffect[]
  gotoStep?: number
}

export interface StoryStep {
  mode?: DialogMode
  speaker?: string
  characterName?: string
  portraitUrl?: string
  imageUrl?: string
  content: string
  effects?: EventEffect[]
  choices?: StoryChoice[]
}

export interface StoryEvent {
  id: string
  title?: string
  trigger: TriggerType
  triggerFilter?: { nodeType?: NodeType; battleResult?: 'win' | 'lose'; actionType?: string }
  condition: EventCondition
  priority: number
  repeatable: boolean
  flagOnStart?: string
  steps: StoryStep[]
  onComplete?: EventEffect[]
}

export interface PendingEvent {
  eventId: string
  stepIndex: number
}

export interface SaveMeta {
  id: string
  title: string
  savedAt: string
  turn: number
  spiritStone: number
  exploredNodes: number
}

export interface SaveRecord {
  meta: SaveMeta
  data: GameSession
}
