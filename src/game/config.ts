import type { GameConfig } from '@/game/types'

export const defaultConfig: GameConfig = {
  map: {
    nodeCount: 20,
    townRatio: 0.5,
    sectRatio: 0.2,
    ruinRatio: 0.2,
    specialRatio: 0.1,
    knownNeighborCount: 3,
    averageConnections: 2.6,
    hubBias: 0.22,
  },
  progress: {
    maxTurns: 80,
    initialMoveRange: 1,
    initialSpiritStone: 520,
    cargoCapacity: 2,
    startingTradeLinkCapacity: 1,
    startingRetainerCapacity: 2,
    finalObjectiveProsperityThreshold: 3,
  },
  economy: {
    originDiscount: 0.5,
    baseIncomePerProduct: 11,
    auctionBonus: 0.2,
    tradeLinkMaintenance: 12,
    retainerUpgradeBaseCost: 200,
    cargoUpgradeBaseCost: 120,
    moveRangeUpgradeBaseCost: 180,
  },
  market: {
    minModifier: 0.5,
    maxModifier: 1.5,
    tradeImpactPerUnit: 0.01,
    modifierRecoveryPerTurn: 0.05,
    baseTravelCost: 10,
    familiarityMax: 4,
    familiarityGainPerTravel: 1,
  },
  exploration: {
    tavernRumorCost: 8,
    tavernSuccessRate: 0.68,
  },
}

export const presetConfigs: Record<string, { label: string; overrides: Partial<GameConfig> }> = {
  standard: {
    label: '标准',
    overrides: {},
  },
  explore: {
    label: '探索',
    overrides: {
      map: {
        ...defaultConfig.map,
        nodeCount: 24,
        knownNeighborCount: 4,
      },
      progress: {
        ...defaultConfig.progress,
        maxTurns: 90,
      },
      exploration: {
        ...defaultConfig.exploration,
        tavernSuccessRate: 0.8,
      },
    },
  },
  commerce: {
    label: '经营',
    overrides: {
      economy: {
        ...defaultConfig.economy,
        baseIncomePerProduct: 14,
        auctionBonus: 0.26,
      },
      progress: {
        ...defaultConfig.progress,
        startingTradeLinkCapacity: 2,
      },
    },
  },
  tight: {
    label: '紧凑',
    overrides: {
      progress: {
        ...defaultConfig.progress,
        maxTurns: 60,
      },
      market: {
        ...defaultConfig.market,
        tradeImpactPerUnit: 0.015,
      },
      economy: {
        ...defaultConfig.economy,
        tradeLinkMaintenance: 16,
      },
    },
  },
}

export function mergeConfig(base: GameConfig, overrides: Partial<GameConfig>): GameConfig {
  return {
    map: { ...base.map, ...overrides.map },
    progress: { ...base.progress, ...overrides.progress },
    economy: { ...base.economy, ...overrides.economy },
    market: { ...base.market, ...overrides.market },
    exploration: { ...base.exploration, ...overrides.exploration },
  }
}
