export type NodeType = 'town' | 'sect' | 'ruin' | 'special'
export type DiscoveryState = 'hidden' | 'rumor' | 'confirmed'
export type ProductCategory = 'herb' | 'ore' | 'pelt' | 'essence' | 'talisman' | 'elixir' | 'equipment'
export type Realm = 'qi' | 'foundation' | 'golden' | 'nascent'
export type BuildingType = 'hub' | 'alchemy' | 'forge' | 'sigil' | 'auction'
export type RetainerStatus = 'idle' | 'busy' | 'trade'
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
  tradeLinkCapacity: number
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
  reputation: number
}

export interface WorldState {
  seed: number
  currentTurn: number
  maxTurns: number
  nodes: NodeState[]
  edges: EdgeState[]
  selectedNodeId: string
  pendingPlan?: TurnPlanState
  logs: string[]
  finalObjectiveUnlocked: boolean
  finalObjectiveCompleted: boolean
  lastMoveRangeUpgradeUnlocked: boolean
  ending?: EndingState
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
  startingTradeLinkCapacity: number
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
