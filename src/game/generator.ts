import { defaultConfig } from '@/game/config'
import { allCategories, craftedCategories, getProductsForNodeType, productMap, rawMaterialCategories } from '@/game/data'
import { ensureRuinExploration } from '@/game/engine'
import type {
  BranchState,
  BuildingState,
  CargoItem,
  EdgeState,
  GameConfig,
  GameSession,
  GuildState,
  InventoryEntry,
  MarketModifierState,
  NodeState,
  NodeType,
  PlayerItem,
  PlayerState,
  QuestState,
  RetainerState,
  StoryEvent,
  TradeLinkState,
} from '@/game/types'
import { smallEvents } from '@/game/events/smallEvents'
import { questEvents } from '@/game/events/questEvents'
import { eventChains } from '@/game/events/eventChains'

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

  // TODO: 非城镇据点的特产层次感不足，sect/ruin 仅有 1 种且与 town 的高阶产物重叠，后续需调整 realm 分配逻辑
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
      reputation: 0,
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

  // 城镇联通开局：其余城镇与联通路径由 revealTownMst 揭示，此处不再散布邻居传闻
  if (config.map.openTownsAtStart) return startNode

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

/**
 * 城镇联通开局：以起始城镇为根，构建连接所有城镇的最小生成树（Steiner 树近似）。
 * 规则：
 * 1. 只以城镇为连接目标，非城镇节点仅在成为城镇间必经路径时被揭示；
 *    路径端点只会是城镇或已联通集合，因此非城镇节点不会以叶子形态出现在联通主干上。
 * 2. 路径成本 = 距离 + 揭示非城镇节点的惩罚，优先选择揭示更少非城镇据点的路径
 *    （惩罚远大于任何地图距离，先比较揭示数量，再比较距离）。
 */
function revealTownMst(nodes: NodeState[], edges: EdgeState[], startNode: NodeState) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const uncoveredTowns = new Set(nodes.filter((node) => node.type === 'town').map((node) => node.id))
  uncoveredTowns.delete(startNode.id)
  if (uncoveredTowns.size === 0) return

  // 揭示一个非城镇节点的惩罚成本：远大于任意地图距离，保证优先减少揭示数量
  const NON_TOWN_REVEAL_PENALTY = 10_000

  const edgesByNode = new Map<string, EdgeState[]>()
  nodes.forEach((node) => edgesByNode.set(node.id, []))
  edges.forEach((edge) => {
    edgesByNode.get(edge.fromNodeId)!.push(edge)
    edgesByNode.get(edge.toNodeId)!.push(edge)
  })

  const edgeBetween = (a: string, b: string) =>
    edgesByNode.get(a)!.find((edge) => edge.fromNodeId === b || edge.toNodeId === b)

  // 已联通集合：开局仅包含起始城镇，路径展开后逐步并入必经节点与城镇
  const connected = new Set<string>([startNode.id])
  const mstEdges = new Set<EdgeState>()

  while (uncoveredTowns.size > 0) {
    // 多源 Dijkstra：connected 全部作为源，找总成本（距离 + 非城镇惩罚）最小的未覆盖城镇
    const dist = new Map(nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
    const prev = new Map<string, string>()
    const settled = new Set<string>()
    connected.forEach((id) => dist.set(id, 0))

    let targetTown: string | null = null
    while (settled.size < nodes.length) {
      let current: string | null = null
      let bestCost = Number.POSITIVE_INFINITY
      for (const node of nodes) {
        if (!settled.has(node.id)) {
          const cost = dist.get(node.id)!
          if (cost < bestCost) {
            bestCost = cost
            current = node.id
          }
        }
      }
      if (current === null || bestCost === Number.POSITIVE_INFINITY) break
      settled.add(current)
      if (uncoveredTowns.has(current)) {
        targetTown = current
        break
      }
      for (const edge of edgesByNode.get(current)!) {
        const otherId = edge.fromNodeId === current ? edge.toNodeId : edge.fromNodeId
        if (settled.has(otherId)) continue
        const neighbor = nodeById.get(otherId)!
        const revealCost = neighbor.type === 'town' ? 0 : NON_TOWN_REVEAL_PENALTY
        const cost = bestCost + distance(nodeById.get(current)!, neighbor) + revealCost
        if (cost < dist.get(otherId)!) {
          dist.set(otherId, cost)
          prev.set(otherId, current)
        }
      }
    }

    // 图不连通，无可达城镇时停止
    if (!targetTown) break

    // 沿最短路径回溯展开，并入节点与边
    let cursor: string | undefined = targetTown
    while (cursor !== undefined) {
      connected.add(cursor)
      const parent = prev.get(cursor)
      if (parent !== undefined) {
        const edge = edgeBetween(cursor, parent)
        if (edge) mstEdges.add(edge)
      }
      cursor = parent
    }
    uncoveredTowns.delete(targetTown)
  }

  mstEdges.forEach((edge) => {
    edge.discovery = 'confirmed'
  })
  connected.forEach((nodeId) => {
    const node = nodeById.get(nodeId)!
    node.discovery = 'confirmed'
    node.knownProducts = true
  })
}

export function createNewGame(config: GameConfig = defaultConfig, seed = Date.now(), guildName = '太虚商会') {
  const nodes = createNodes(config, seed)
  const edges = createEdges(nodes, config, seed)
  const startNode = revealInitialArea(nodes, edges, config, seed)
  if (config.map.openTownsAtStart) {
    revealTownMst(nodes, edges, startNode)
  }

  const player: PlayerState = {
    currentNodeId: startNode.id,
    spiritStone: config.progress.initialSpiritStone,
    moveRange: config.progress.initialMoveRange,
    cargoCapacity: config.progress.cargoCapacity,
    cargo: [] as CargoItem[],
    items: [
      { id: 'item-golden-armor-start', name: '金甲符', stackable: true, count: 3 },
      { id: 'item-poison-pill-start', name: '避毒丹', stackable: true, count: 3 },
      { id: 'item-formation-pearl-start', name: '破阵珠', stackable: true, count: 3 },
    ] as PlayerItem[],
    retainerCapacity: config.progress.startingRetainerCapacity,
    airshipDurability: 100,
    airshipMaxDurability: 100,
    airshipCrew: 80,
    airshipMaxCrew: 80,
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
    reputation: 0,
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
      startingNodeId: startNode.id,
      pendingPlan: undefined,
      generatedEvents: [],
      logs: ['你获得了限期开拓许可，商会飞舟从起始城镇启航。'],
      finalObjectiveUnlocked: false,
      finalObjectiveCompleted: false,
      lastMoveRangeUpgradeUnlocked: false,
      ruinMapsAvailable: nodes.filter((n) => n.type === 'ruin').map((n) => n.id),
    },
    storyFlags: {},
  }

  // 初始化所有废墟的探索地图（避免事件触发时 lazy 初始化导致数据不一致）
  for (const node of nodes) {
    if (node.type === 'ruin') {
      ensureRuinExploration(session, node.id)
    }
  }

  distributeEvents(session)
  return session
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  let value = Math.abs(seed) % 2147483647
  if (value <= 0) value += 2147483646
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i -= 1) {
    value = (value * 16807) % 2147483647
    const j = Math.floor(((value - 1) / 2147483646) * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * 将 arrive 触发的事件分配到各据点，类似 relic 系统的生成逻辑。
 * 每个事件实例只绑定在一个特定节点上，避免访问时随机 roll 太密集。
 */
function distributeEvents(session: GameSession) {
  // ══════════════════════════════════════════════
  // 1. 宗门秘宝 — 生成遗物配对 + 归还事件
  // ══════════════════════════════════════════════
  const sects = session.world.nodes.filter((n) => n.type === 'sect')
  const ruins = session.world.nodes.filter((n) => n.type === 'ruin')
  const relicReturnEvents: StoryEvent[] = []
  if (sects.length > 0 && ruins.length > 0) {
    const count = Math.min(3, sects.length, ruins.length)
    const pickedSects = seededShuffle(sects, session.world.seed + 9999).slice(0, count)
    const shuffledRuins = seededShuffle(ruins, session.world.seed + 8888)
    const suffixes = seededShuffle(
      ['镇门之宝', '传世法宝', '护宗秘宝', '开派遗宝', '历代传承', '祖师遗物'],
      session.world.seed + 7777,
    )

    const relicPairs: Array<{ ruinName: string; relicName: string; sectName: string; flagPrefix: string }> = []

    pickedSects.forEach((sect, index) => {
      const ruin = shuffledRuins[index % shuffledRuins.length]
      const suffix = suffixes[index % suffixes.length]
      const relicName = `${sect.name}${suffix}`
      const rewardSs = 600 + Math.floor(Math.random() * 400)
      const flagPrefix = `relic_${sect.id}`

      // 在废墟上标记遗物数据，探索完成后发放
      ruin.relicData = { itemName: relicName, flagPrefix }
      relicPairs.push({ ruinName: ruin.name, relicName, sectName: sect.name, flagPrefix })

      // 到宗门归还遗物事件（类似分配事件，直接绑定 nodeId）
      relicReturnEvents.push({
        id: `${flagPrefix}_return`,
        title: `归还遗物`,
        trigger: 'arrive',
        condition: {
          nodeId: sect.id,
          flagsRequired: [`${flagPrefix}_found`],
          flagsBlocked: [`${flagPrefix}_returned`],
        },
        priority: 10,
        repeatable: false,
        flagOnStart: `${flagPrefix}_return_encountered`,
        steps: [
          {
            mode: 'portrait-right',
            speaker: '宗门长老',
            characterName: '宗门长老',
            portraitUrl: `${import.meta.env.BASE_URL}images/portraits/char-01.webp`,
            content: `会长亲临，有失远迎。敢问何事劳烦大驾？`,
          },
          {
            mode: 'portrait-left',
            speaker: '会长',
            portraitUrl: `${import.meta.env.BASE_URL}images/portraits/char-01.webp`,
            content: `前些日子在${ruin.name}探查，发现了一件贵派古物，应当是贵派遗失之物，特来奉还。`,
          },
          {
            mode: 'portrait-right',
            speaker: '宗门长老',
            characterName: '宗门长老',
            portraitUrl: `${import.meta.env.BASE_URL}images/portraits/char-01.webp`,
            content: `（接过法器，双手微颤）这……这是我派遗失多年的${suffix}！会长大恩，本门铭记于心！`,
          },
          {
            mode: 'portrait-left',
            speaker: '会长',
            portraitUrl: `${import.meta.env.BASE_URL}images/portraits/char-01.webp`,
            content: `物归原主，不必言谢。`,
            effects: [
              { type: 'remove_item', itemName: relicName },
              { type: 'add_spirit_stone', amount: rewardSs },
              { type: 'set_flag', flag: `${flagPrefix}_returned` },
            ],
          },
        ],
        onComplete: [],
      })
    })

    // 控制台遗物清单
    console.log('%c═══ 本局遗物清单 ═══', 'font-size:14px;font-weight:bold;color:#f0c080')
    relicPairs.forEach((pair, i) => {
      console.log(
        `  ${i + 1}. 探索「%c${pair.ruinName}%c」可获得「%c${pair.relicName}%c」，归还至「%c${pair.sectName}%c」领取奖励`,
        'color:#8fdf8f;font-weight:bold',
        '',
        'color:#f0c080;font-weight:bold',
        '',
        'color:#8fc8f0;font-weight:bold',
        '',
      )
    })
    console.log('%c══════════════════', 'font-size:14px;font-weight:bold;color:#f0c080')
  }

  // ══════════════════════════════════════════════
  // 2. 剧情事件 — 分配到各据点
  // ══════════════════════════════════════════════
  const allArriveEvents: StoryEvent[] = [
    ...smallEvents.filter((e) => e.trigger === 'arrive'),
    ...questEvents.filter((e) => e.trigger === 'arrive'),
    ...eventChains.filter((e) => e.trigger === 'arrive'),
  ]

  const globalEvents: StoryEvent[] = [
    ...smallEvents.filter((e) => e.trigger !== 'arrive'),
    ...eventChains.filter((e) => e.trigger !== 'arrive'),
  ]

  // produced = 遗物归还事件 + 全局事件（turn_end/action 等）+ 分配到据点的 arrive 事件
  const produced: StoryEvent[] = [
    ...relicReturnEvents,
    ...globalEvents.map((e) => structuredClone(e)),
  ]

  const rng = createRng(session.world.seed + 33333)
  const nodes = session.world.nodes.filter((n) => n.id !== session.world.startingNodeId)

  if (nodes.length > 0) {
    // 记录每个节点已分配的事件数，尽量均匀
    const nodeCounts = new Map<string, number>()
    for (const node of nodes) nodeCounts.set(node.id, 0)

    for (const event of allArriveEvents) {
      const preferredType = event.condition.nodeType
      let compatible = nodes
      if (preferredType) compatible = compatible.filter((n) => n.type === preferredType)
      if (compatible.length === 0) compatible = nodes // 降级到全部节点

      // 选已分配事件最少的节点
      compatible.sort((a, b) => (nodeCounts.get(a.id) ?? 0) - (nodeCounts.get(b.id) ?? 0))
      const poolSize = Math.min(3, compatible.length)
      const chosen = compatible[Math.floor(rng() * poolSize)]

      nodeCounts.set(chosen.id, (nodeCounts.get(chosen.id) ?? 0) + 1)

      // 创建实例，绑定到具体节点
      produced.push({
        ...event,
        condition: {
          ...event.condition,
          nodeId: chosen.id,
          randomChance: undefined,
          nodeType: undefined,
          excludeStartingNode: undefined,
        },
        steps: event.steps.map((s) => ({
          ...s,
          choices: s.choices?.map((c) => ({ ...c, effects: c.effects ? [...c.effects] : [] })),
        })),
        onComplete: event.onComplete?.map((e) => ({ ...e })),
      })
    }
  }

  session.world.generatedEvents = produced

  // ── 控制台输出事件分配清单 ──
  console.log('%c═══ 本局事件分配 ═══', 'font-size:14px;font-weight:bold;color:#8fc8f0')
  for (const node of nodes) {
    const eventsHere = produced.filter((e) => e.condition.nodeId === node.id)
    if (eventsHere.length === 0) continue
    console.log(
      `%c${node.name}%c (${node.type}) → ${eventsHere.length} 个事件:`,
      'color:#8fdf8f;font-weight:bold',
      '',
    )
    for (const ev of eventsHere) {
      console.log(`  · ${ev.title ?? ev.id}`)
    }
  }
  console.log('%c══════════════════', 'font-size:14px;font-weight:bold;color:#8fc8f0')
}
