import { defaultConfig } from '@/game/config'
import { allCategories, craftedCategories, getProductsForNodeType, productMap, rawMaterialCategories } from '@/game/data'
import type {
  CargoItem,
  EdgeState,
  GameConfig,
  GameSession,
  GuildState,
  MarketModifierState,
  NodeState,
  NodeType,
  PlayerItem,
  PlayerState,
  QuestState,
} from '@/game/types'

function createRng(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const nodeNamePools: Record<NodeType, string[]> = {
  town: [
    '清河坊',
    '栖霞镇',
    '临渊集',
    '白蘋渡',
    '鸣泉里',
    '回风市',
    '松烟埠',
    '照溪城',
    '月桥镇',
    '归云坊',
    '听潮集',
    '柳汀渡',
    '栖梧镇',
    '落梅里',
    '长桥埠',
    '晴沙镇',
  ],
  sect: [
    '太虚门',
    '青岚宗',
    '玄霜观',
    '栖云剑派',
    '流霞山',
    '灵鹤宫',
    '藏风谷',
    '玉泉别院',
    '赤霞峰',
    '听雪阁',
    '丹霞宗',
    '紫霄观',
    '松涛院',
    '问心经',
  ],
  ruin: [
    '断碑遗址',
    '沉钟废城',
    '白骨古渡',
    '荒火坛',
    '落星残垣',
    '埋霞旧苑',
    '断剑台',
    '黑沙故宫',
    '残月塔林',
    '烬风关',
    '无名古窟',
    '枯井秘坊',
    '碎玉宫墟',
    '寒泉旧址',
  ],
  special: [
    '天裂峡',
    '浮灯海眼',
    '归墟天井',
    '青铜天门',
    '落雷泽',
    '灵潮裂隙',
    '万象石林',
    '九曲云涧',
    '沉星湖',
    '蜃雾深谷',
  ],
}

const repeatSuffixes = ['二', '三', '四', '五', '六', '七', '八', '九']

function pickNodeType(index: number, count: number, config: GameConfig['map'], rng: () => number): NodeType {
  const townTarget = Math.round(count * config.townRatio)
  const sectTarget = Math.round(count * config.sectRatio)
  const ruinTarget = Math.round(count * config.ruinRatio)
  if (index < townTarget) return 'town'
  if (index < townTarget + sectTarget) return 'sect'
  if (index < townTarget + sectTarget + ruinTarget) return 'ruin'
  return rng() < config.specialRatio / Math.max(config.specialRatio, 0.1) ? 'special' : 'town'
}

function shuffle<T>(input: T[], rng: () => number): T[] {
  const items = [...input]
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
  }
  return items
}

function createNodeNamePicker(rng: () => number) {
  const shuffledPools: Record<NodeType, string[]> = {
    town: shuffle(nodeNamePools.town, rng),
    sect: shuffle(nodeNamePools.sect, rng),
    ruin: shuffle(nodeNamePools.ruin, rng),
    special: shuffle(nodeNamePools.special, rng),
  }
  const usageCount: Record<NodeType, number> = {
    town: 0,
    sect: 0,
    ruin: 0,
    special: 0,
  }

  return (type: NodeType) => {
    const pool = shuffledPools[type]
    const usage = usageCount[type]
    usageCount[type] += 1
    const baseName = pool[usage % pool.length]
    const round = Math.floor(usage / pool.length)
    if (round === 0) return baseName
    const suffix = repeatSuffixes[round - 1] ?? `${round + 1}`
    return `${baseName}·其${suffix}`
  }
}

function distance(a: NodeState, b: NodeState) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function orientation(a: NodeState, b: NodeState, c: NodeState) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function onSegment(a: NodeState, b: NodeState, c: NodeState) {
  return (
    Math.min(a.x, b.x) <= c.x &&
    c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y &&
    c.y <= Math.max(a.y, b.y)
  )
}

function segmentsIntersect(a: NodeState, b: NodeState, c: NodeState, d: NodeState) {
  if (a.id === c.id || a.id === d.id || b.id === c.id || b.id === d.id) return false

  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)

  if (o1 === 0 && onSegment(a, b, c)) return true
  if (o2 === 0 && onSegment(a, b, d)) return true
  if (o3 === 0 && onSegment(c, d, a)) return true
  if (o4 === 0 && onSegment(c, d, b)) return true

  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0)
}

function createDisjointSet(nodes: NodeState[]) {
  const parent = new Map(nodes.map((node) => [node.id, node.id]))
  const rank = new Map(nodes.map((node) => [node.id, 0]))

  const find = (nodeId: string): string => {
    const current = parent.get(nodeId)!
    if (current === nodeId) return current
    const root = find(current)
    parent.set(nodeId, root)
    return root
  }

  const union = (leftId: string, rightId: string) => {
    const leftRoot = find(leftId)
    const rightRoot = find(rightId)
    if (leftRoot === rightRoot) return false

    const leftRank = rank.get(leftRoot) ?? 0
    const rightRank = rank.get(rightRoot) ?? 0

    if (leftRank < rightRank) {
      parent.set(leftRoot, rightRoot)
    } else if (leftRank > rightRank) {
      parent.set(rightRoot, leftRoot)
    } else {
      parent.set(rightRoot, leftRoot)
      rank.set(leftRoot, leftRank + 1)
    }
    return true
  }

  return { find, union }
}

function createMarketState(): MarketModifierState {
  return {
    categories: Object.fromEntries(allCategories.map((category) => [category, 1])) as MarketModifierState['categories'],
  }
}

function createInventoryForNode(node: NodeState) {
  const inventory: NodeState['inventory'] = {}
  node.baseProducts.forEach((productId) => {
    inventory[productId] = { quantity: 1, max: 1 }
  })
  return inventory
}

function pickSpecialtyProducts(nodeType: NodeType, rng: () => number) {
  const pickFromPool = (categories: typeof rawMaterialCategories, amount: number, maxRealmTier: number) => {
    const candidates = shuffle(
      getProductsForNodeType(nodeType, {
        categories,
        maxRealmTier,
      }),
      rng,
    )
    return candidates.slice(0, amount).map((item) => item.id)
  }

  if (nodeType === 'sect') {
    return pickFromPool(craftedCategories, 1, 4)
  }

  if (nodeType === 'ruin') {
    return pickFromPool(rawMaterialCategories, 1, 4)
  }

  if (nodeType === 'town') {
    const amount = 2 + Math.floor(rng() * 2)
    return pickFromPool([...rawMaterialCategories, ...craftedCategories], amount, 2)
  }

  const mixed = shuffle(
    getProductsForNodeType(nodeType, {
      maxRealmTier: 3,
    }),
    rng,
  )
  return mixed.slice(0, 2).map((item) => item.id)
}

function createNodes(config: GameConfig, seed: number) {
  const rng = createRng(seed)
  const nodes: NodeState[] = []
  const count = config.map.nodeCount
  const randomTypes = shuffle(Array.from({ length: count }, (_, index) => pickNodeType(index, count, config.map, rng)), rng)
  const minGapBase = Math.max(8, Math.min(14, 70 / Math.sqrt(Math.max(1, count))))
  const pickNodeName = createNodeNamePicker(rng)

  for (let index = 0; index < count; index += 1) {
    const type = randomTypes[index]
    const prosperity = type === 'town' ? Math.min(4, 2 + Math.floor(rng() * 2)) : undefined
    let x = 12 + rng() * 76
    let y = 12 + rng() * 76
    let threshold = minGapBase

    for (let attempt = 0; attempt < 180; attempt += 1) {
      const candidateX = 12 + rng() * 76
      const candidateY = 12 + rng() * 76
      const farEnough = nodes.every((node) => Math.hypot(node.x - candidateX, node.y - candidateY) >= threshold)
      if (farEnough) {
        x = candidateX
        y = candidateY
        break
      }
      if ((attempt + 1) % 36 === 0) threshold *= 0.9
    }

    const node: NodeState = {
      id: `node-${index}`,
      name: pickNodeName(type),
      type,
      x,
      y,
      prosperity,
      discovery: 'hidden',
      knownProducts: false,
      baseProducts: [],
      inventory: {},
      market: createMarketState(),
    }
    node.baseProducts = pickSpecialtyProducts(type, rng)
    node.inventory = createInventoryForNode(node)
    nodes.push(node)
  }

  return nodes
}

function createEdges(nodes: NodeState[], config: GameConfig, seed: number) {
  const rng = createRng(seed + 17)
  const edges: EdgeState[] = []
  const connected = new Set<string>()
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const rankedNeighbors = new Map<string, string[]>()
  const candidates: Array<{ fromNodeId: string; toNodeId: string; score: number; distance: number }> = []

  nodes.forEach((node) => {
    const sortedNeighbors = nodes
      .filter((item) => item.id !== node.id)
      .sort((left, right) => distance(node, left) - distance(node, right))
    rankedNeighbors.set(
      node.id,
      sortedNeighbors.map((item) => item.id),
    )
  })

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex]
      const right = nodes[rightIndex]
      const dist = distance(left, right)
      candidates.push({
        fromNodeId: left.id,
        toNodeId: right.id,
        distance: dist,
        score: dist + rng() * 0.12,
      })
    }
  }

  candidates.sort((left, right) => left.score - right.score)

  const intersectsExisting = (fromId: string, toId: string) => {
    const from = nodeById.get(fromId)!
    const to = nodeById.get(toId)!
    return edges.some((edge) => {
      const edgeFrom = nodeById.get(edge.fromNodeId)!
      const edgeTo = nodeById.get(edge.toNodeId)!
      return segmentsIntersect(from, to, edgeFrom, edgeTo)
    })
  }

  const pushEdge = (fromNodeId: string, toNodeId: string) => {
    const edgeKey = [fromNodeId, toNodeId].sort().join(':')
    if (connected.has(edgeKey)) return false
    connected.add(edgeKey)
    edges.push({
      id: `edge-${edges.length}`,
      fromNodeId,
      toNodeId,
      discovery: 'hidden',
      familiarityLevel: 0,
      baseTravelCost: config.market.baseTravelCost,
    })
    return true
  }

  const disjointSet = createDisjointSet(nodes)
  candidates.forEach((candidate) => {
    if (edges.length >= nodes.length - 1) return
    if (disjointSet.find(candidate.fromNodeId) === disjointSet.find(candidate.toNodeId)) return
    pushEdge(candidate.fromNodeId, candidate.toNodeId)
    disjointSet.union(candidate.fromNodeId, candidate.toNodeId)
  })

  const degrees = new Map(nodes.map((node) => [node.id, 0]))
  edges.forEach((edge) => {
    degrees.set(edge.fromNodeId, (degrees.get(edge.fromNodeId) ?? 0) + 1)
    degrees.set(edge.toNodeId, (degrees.get(edge.toNodeId) ?? 0) + 1)
  })

  const centerSorted = [...nodes]
    .sort((left, right) => Math.hypot(left.x - 50, left.y - 50) - Math.hypot(right.x - 50, right.y - 50))
    .map((node) => node.id)
  const hubAllowance = Math.max(1, Math.round(nodes.length * config.map.hubBias))
  const hubSet = new Set(centerSorted.slice(0, hubAllowance))
  const totalEdgeTarget = Math.max(nodes.length - 1, Math.round((nodes.length * config.map.averageConnections) / 2))
  const neighborWindow = 3 + Math.round(config.map.hubBias * 8)

  for (const candidate of candidates) {
    if (edges.length >= totalEdgeTarget) break
    const edgeKey = [candidate.fromNodeId, candidate.toNodeId].sort().join(':')
    if (connected.has(edgeKey)) continue

    const fromRank = rankedNeighbors.get(candidate.fromNodeId)?.indexOf(candidate.toNodeId) ?? Number.POSITIVE_INFINITY
    const toRank = rankedNeighbors.get(candidate.toNodeId)?.indexOf(candidate.fromNodeId) ?? Number.POSITIVE_INFINITY
    if (Math.min(fromRank, toRank) > neighborWindow) continue
    if (intersectsExisting(candidate.fromNodeId, candidate.toNodeId)) continue

    const fromLimit = hubSet.has(candidate.fromNodeId) ? 5 : 4
    const toLimit = hubSet.has(candidate.toNodeId) ? 5 : 4
    if ((degrees.get(candidate.fromNodeId) ?? 0) >= fromLimit) continue
    if ((degrees.get(candidate.toNodeId) ?? 0) >= toLimit) continue

    if (pushEdge(candidate.fromNodeId, candidate.toNodeId)) {
      degrees.set(candidate.fromNodeId, (degrees.get(candidate.fromNodeId) ?? 0) + 1)
      degrees.set(candidate.toNodeId, (degrees.get(candidate.toNodeId) ?? 0) + 1)
    }
  }

  return edges
}

function getNeighbors(nodeId: string, edges: EdgeState[]) {
  return edges.flatMap((edge) => {
    if (edge.fromNodeId === nodeId) return [edge.toNodeId]
    if (edge.toNodeId === nodeId) return [edge.fromNodeId]
    return []
  })
}

function revealInitialArea(nodes: NodeState[], edges: EdgeState[], config: GameConfig, seed: number) {
  const rng = createRng(seed + 33)
  const towns = nodes.filter((node) => node.type === 'town')
  const startNode = towns[Math.floor(rng() * towns.length)] ?? nodes[0]
  startNode.discovery = 'confirmed'
  startNode.knownProducts = true

  const neighbors = getNeighbors(startNode.id, edges)
    .map((neighborId) => nodes.find((node) => node.id === neighborId))
    .filter((node): node is NodeState => Boolean(node))
    .sort((left, right) => distance(startNode, left) - distance(startNode, right))
    .slice(0, config.map.knownNeighborCount)

  neighbors.forEach((node) => {
    node.discovery = 'rumor'
    node.knownProducts = true
  })

  edges.forEach((edge) => {
    if (edge.fromNodeId === startNode.id || edge.toNodeId === startNode.id) {
      const otherNodeId = edge.fromNodeId === startNode.id ? edge.toNodeId : edge.fromNodeId
      if (neighbors.some((node) => node.id === otherNodeId)) {
        edge.discovery = 'rumor'
      }
    }
  })

  return startNode
}

export function createNewGame(config: GameConfig = defaultConfig, seed = Date.now(), guildName = '太虚商会') {
  const nodes = createNodes(config, seed)
  const edges = createEdges(nodes, config, seed)
  const startNode = revealInitialArea(nodes, edges, config, seed)

  const player: PlayerState = {
    currentNodeId: startNode.id,
    spiritStone: config.progress.initialSpiritStone,
    moveRange: config.progress.initialMoveRange,
    cargoCapacity: config.progress.cargoCapacity,
    cargo: [] as CargoItem[],
    items: [] as PlayerItem[],
    tradeLinkCapacity: config.progress.startingTradeLinkCapacity,
    retainerCapacity: config.progress.startingRetainerCapacity,
  }

  const guild: GuildState = {
    name: guildName.trim() || '太虚商会',
    branches: [],
    buildings: [],
    tradeLinks: [],
    quests: [] as QuestState[],
    retainers: Array.from({ length: config.progress.startingRetainerCapacity }, (_, index) => ({
      id: `retainer-${index}`,
      name: `供奉${index + 1}`,
      status: 'idle',
      remainingTurns: 0,
    })),
  }

  const session: GameSession = {
    version: 1,
    config,
    player,
    guild,
    world: {
      seed,
      currentTurn: 1,
      maxTurns: config.progress.maxTurns,
      nodes,
      edges,
      selectedNodeId: startNode.id,
      pendingPlan: undefined,
      logs: ['你获得了限期开拓许可，商会飞舟从起始城镇启航。'],
      finalObjectiveUnlocked: false,
      finalObjectiveCompleted: false,
      lastMoveRangeUpgradeUnlocked: false,
    },
  }

  return session
}
