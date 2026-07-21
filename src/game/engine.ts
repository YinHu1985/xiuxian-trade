import { allCategories, productMap } from '@/game/data'
import type {
  BranchState,
  BuildingType,
  EdgeState,
  GameSession,
  NodeState,
  ProductCategory,
  TurnPlanState,
} from '@/game/types'

const tavernFiller = [
  '酒客们争论哪家灵酒最值灵石，最后谁也没说出正经线索。',
  '掌柜只感慨近来路上风沙更重，似乎并没有给出新的方向。',
  '你请了一轮酒，听到的大多是旧年门派恩怨与坊间逸闻。',
]

function cloneSession(session: GameSession) {
  return structuredClone(session)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function addLog(session: GameSession, message: string) {
  session.world.logs = [message, ...session.world.logs].slice(0, 18)
}

function getTravelCost(edge: EdgeState) {
  return Math.max(1, edge.baseTravelCost - edge.familiarityLevel * 2)
}

export function getNode(session: GameSession, nodeId: string) {
  return session.world.nodes.find((node) => node.id === nodeId)
}

export function getCurrentNode(session: GameSession) {
  return getNode(session, session.player.currentNodeId)!
}

export function getSelectedNode(session: GameSession) {
  return getNode(session, session.world.selectedNodeId) ?? getCurrentNode(session)
}

export function getPendingPlan(session: GameSession) {
  return session.world.pendingPlan
}

export function getEdgeBetween(session: GameSession, leftId: string, rightId: string) {
  return session.world.edges.find(
    (edge) =>
      (edge.fromNodeId === leftId && edge.toNodeId === rightId) ||
      (edge.fromNodeId === rightId && edge.toNodeId === leftId),
  )
}

export function getAdjacentEdges(session: GameSession, nodeId: string) {
  return session.world.edges.filter((edge) => edge.fromNodeId === nodeId || edge.toNodeId === nodeId)
}

export function getAdjacentNodes(session: GameSession, nodeId: string) {
  return getAdjacentEdges(session, nodeId).map((edge) => {
    const otherId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId
    return { edge, node: getNode(session, otherId)! }
  })
}

function hasPath(session: GameSession, fromId: string, toId: string) {
  const queue = [fromId]
  const visited = new Set(queue)
  while (queue.length) {
    const nodeId = queue.shift()!
    if (nodeId === toId) return true
    getAdjacentEdges(session, nodeId)
      .filter((edge) => edge.discovery === 'confirmed')
      .forEach((edge) => {
        const nextId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId
        if (!visited.has(nextId)) {
          visited.add(nextId)
          queue.push(nextId)
        }
      })
  }
  return false
}

function getBranch(session: GameSession, nodeId: string) {
  return session.guild.branches.find((branch) => branch.nodeId === nodeId)
}

function getBuilding(branch: BranchState, session: GameSession, type: BuildingType) {
  return branch.buildingIds
    .map((id) => session.guild.buildings.find((building) => building.id === id))
    .find((building) => building?.type === type)
}

function getLocalProducts(session: GameSession, node: NodeState) {
  const branch = getBranch(session, node.id)
  const pool = new Set(node.baseProducts)
  if (!branch) return pool

  if (getBuilding(branch, session, 'hub')) {
    getAdjacentNodes(session, node.id).forEach(({ node: neighbor }) => {
      if (neighbor.discovery !== 'hidden') neighbor.baseProducts.forEach((productId) => pool.add(productId))
    })
  }

  const sourceProducts = [...pool].map((productId) => productMap[productId]).filter(Boolean)
  const hasCategory = (category: ProductCategory) => sourceProducts.some((product) => product.category === category)
  const addDerived = (category: ProductCategory) => {
    sourceProducts.forEach((product) => {
      const derivedId = `${category}-${product.realm}`
      if (productMap[derivedId]) pool.add(derivedId)
    })
  }

  if (getBuilding(branch, session, 'alchemy') && hasCategory('herb')) addDerived('elixir')
  if (getBuilding(branch, session, 'forge') && hasCategory('ore') && hasCategory('pelt')) addDerived('equipment')
  if (getBuilding(branch, session, 'sigil') && hasCategory('pelt') && hasCategory('essence')) addDerived('talisman')

  return pool
}

export function getTradableProducts(session: GameSession, node: NodeState) {
  return [...getLocalProducts(session, node)]
}

function getTradableProductSet(session: GameSession, node: NodeState) {
  return new Set(getTradableProducts(session, node))
}

export function getBranchProductPool(session: GameSession, nodeId: string) {
  const node = getNode(session, nodeId)
  if (!node) return []
  const pool = new Set(getLocalProducts(session, node))
  session.guild.tradeLinks
    .filter((link) => link.fromNodeId === nodeId || link.toNodeId === nodeId)
    .forEach((link) => {
      const otherId = link.fromNodeId === nodeId ? link.toNodeId : link.fromNodeId
      const otherNode = getNode(session, otherId)
      if (!otherNode) return
      getLocalProducts(session, otherNode).forEach((productId) => pool.add(productId))
    })
  return [...pool]
}

export function getBranchIncome(session: GameSession, nodeId: string) {
  const node = getNode(session, nodeId)
  if (!node) return 0
  const branch = getBranch(session, nodeId)
  if (!branch) return 0
  const multiplier = getBuilding(branch, session, 'auction') ? 1 + session.config.economy.auctionBonus : 1
  const prosperityBonus = node.type === 'town' ? (node.prosperity ?? 0) * 0.12 : 0
  return Math.round(
    getBranchProductPool(session, nodeId).length *
      session.config.economy.baseIncomePerProduct *
      (1 + prosperityBonus) *
      multiplier,
  )
}

function applyMarketChange(node: NodeState, category: ProductCategory, delta: number, session: GameSession) {
  const { minModifier, maxModifier } = session.config.market
  node.market.categories[category] = clamp(node.market.categories[category] + delta, minModifier, maxModifier)
}

export function getProductPrice(session: GameSession, node: NodeState, productId: string, mode: 'buy' | 'sell') {
  const product = productMap[productId]
  const modifier = node.market.categories[product.category]
  const base = product.basePrice * modifier
  const isLocalSpecialty = getTradableProductSet(session, node).has(productId)
  if (mode === 'buy') {
    if (!isLocalSpecialty) return null
    return Math.round(base * session.config.economy.originDiscount)
  }
  return Math.round(base * (isLocalSpecialty ? session.config.economy.originDiscount : 1))
}

function refreshNodeInventory(node: NodeState, session: GameSession) {
  node.inventory = Object.fromEntries(
    getTradableProducts(session, node).map((productId) => [productId, { quantity: 1, max: 1 }]),
  )
  allCategories.forEach((category) => {
    node.market.categories[category] = clamp(
      node.market.categories[category] + Math.sign(1 - node.market.categories[category]) * Math.min(session.config.market.modifierRecoveryPerTurn, Math.abs(1 - node.market.categories[category])),
      session.config.market.minModifier,
      session.config.market.maxModifier,
    )
  })
}

function finalizeTurn(session: GameSession, message: string, traveledEdges: EdgeState[] = []) {
  session.world.currentTurn += 1
  session.world.pendingPlan = undefined
  session.world.nodes.forEach((node) => refreshNodeInventory(node, session))
  traveledEdges.forEach((traveledEdge) => {
    traveledEdge.familiarityLevel = Math.min(
      session.config.market.familiarityMax,
      traveledEdge.familiarityLevel + session.config.market.familiarityGainPerTravel,
    )
  })
  const branchIncome = session.guild.branches.reduce((sum, branch) => sum + getBranchIncome(session, branch.nodeId), 0)
  const maintenance = session.guild.tradeLinks.reduce((sum, link) => sum + link.maintenanceCost, 0)
  session.player.spiritStone += branchIncome - maintenance
  session.guild.retainers.forEach((retainer) => {
    if (retainer.status === 'busy') {
      retainer.remainingTurns -= 1
      if (retainer.remainingTurns <= 0) {
        retainer.status = 'idle'
        retainer.targetNodeId = undefined
      }
    }
  })
  if (session.guild.branches.length >= session.config.progress.finalObjectiveProsperityThreshold && session.player.spiritStone >= 1200) {
    session.world.finalObjectiveUnlocked = true
  }
  addLog(
    session,
    `${message} 本回合商号净收益 ${branchIncome - maintenance >= 0 ? '+' : ''}${branchIncome - maintenance} 灵石。`,
  )
  if (session.player.spiritStone < 0) {
    session.world.ending = buildEnding(session, true)
  } else if (session.world.currentTurn > session.world.maxTurns) {
    session.world.ending = buildEnding(session, false)
  }
}

function buildEnding(session: GameSession, failed: boolean) {
  const exploration = session.world.nodes.filter((node) => node.discovery === 'confirmed').length * 12
  const commerce = session.guild.branches.length * 120
  const network = session.guild.tradeLinks.length * 140
  const capital = Math.max(0, Math.round(session.player.spiritStone))
  const totalScore = exploration + commerce + network + capital
  const title = failed ? '商会折戟' : totalScore > 2200 ? '一方巨贾' : totalScore > 1400 ? '开拓有成' : '初立根基'
  const summary = failed
    ? '你未能在许可期内维持现金流，但商会曾留下的据点、道路与传闻，仍在这片区域回响。'
    : session.world.finalObjectiveCompleted
      ? '你不但建立了稳固商路，还借商业力量推动终局探索，商会前景已超出普通地方行会。'
      : '许可期结束时，商会已在灾后区域赢得一席之地，未来仍有继续扩张的空间。'
  return { title, summary, totalScore, scores: { exploration, commerce, network, capital }, failed }
}

export function selectNode(session: GameSession, nodeId: string) {
  const next = cloneSession(session)
  next.world.selectedNodeId = nodeId
  return next
}

export function tavernRumor(session: GameSession) {
  const next = cloneSession(session)
  const node = getCurrentNode(next)
  if (next.player.spiritStone < next.config.exploration.tavernRumorCost) return next
  next.player.spiritStone -= next.config.exploration.tavernRumorCost
  const rumorCandidates = getAdjacentNodes(next, node.id).filter(({ edge }) => edge.discovery !== 'confirmed')
  if (rumorCandidates.length && Math.random() < next.config.exploration.tavernSuccessRate) {
    const target = rumorCandidates[Math.floor(Math.random() * rumorCandidates.length)]
    if (target.node.discovery === 'hidden') {
      target.node.discovery = 'rumor'
      target.node.knownProducts = true
    }
    target.edge.discovery = 'rumor'
    addLog(next, `你在落脚处听说：从这里出发有道路可直抵 ${target.node.name}。`)
  } else {
    addLog(next, tavernFiller[Math.floor(Math.random() * tavernFiller.length)])
  }
  return next
}

export function buyProduct(session: GameSession, productId: string) {
  const next = cloneSession(session)
  const node = getCurrentNode(next)
  const price = getProductPrice(next, node, productId, 'buy')
  if (!price || next.player.cargo.length >= next.player.cargoCapacity || next.player.spiritStone < price) return next
  const entry = node.inventory[productId] ?? { quantity: 1, max: 1 }
  node.inventory[productId] = entry
  if (entry.quantity <= 0) return next
  next.player.spiritStone -= price
  entry.quantity -= 1
  next.player.cargo.push({ id: `cargo-${Date.now()}-${Math.random()}`, productId, purchasedAtNodeId: node.id, cost: price })
  applyMarketChange(node, productMap[productId].category, next.config.market.tradeImpactPerUnit, next)
  addLog(next, `购入 ${productMap[productId].name}，花费 ${price} 灵石。`)
  return next
}

export function sellCargo(session: GameSession, cargoId: string) {
  const next = cloneSession(session)
  const node = getCurrentNode(next)
  const cargo = next.player.cargo.find((item) => item.id === cargoId)
  if (!cargo) return next
  const price = getProductPrice(next, node, cargo.productId, 'sell')
  if (!price) return next
  next.player.spiritStone += price
  next.player.cargo = next.player.cargo.filter((item) => item.id !== cargoId)
  applyMarketChange(node, productMap[cargo.productId].category, -next.config.market.tradeImpactPerUnit, next)
  addLog(next, `售出 ${productMap[cargo.productId].name}，获得 ${price} 灵石。`)
  return next
}

export function moveOrExplore(session: GameSession, targetNodeId: string) {
  const next = cloneSession(session)
  const travel = getTravelOption(next, targetNodeId)
  if (!travel.available || !travel.target) return next
  if (next.player.spiritStone < travel.cost) return next
  next.player.spiritStone -= travel.cost

  if (travel.kind === 'explore') {
    const edge = travel.edges[0]
    edge.discovery = 'confirmed'
    travel.target.discovery = 'confirmed'
    travel.target.knownProducts = true
    next.player.currentNodeId = travel.target.id
    next.world.selectedNodeId = travel.target.id
    finalizeTurn(next, `飞舟沿传闻道路探索至 ${travel.target.name}，本次行旅耗费 ${travel.cost} 灵石。`, travel.edges)
    return next
  }

  next.player.currentNodeId = travel.target.id
  next.world.selectedNodeId = travel.target.id
  finalizeTurn(
    next,
    `飞舟沿已确认道路抵达 ${travel.target.name}，跨越 ${travel.steps} 段路程，耗费 ${travel.cost} 灵石。`,
    travel.edges,
  )
  return next
}

export function scheduleTravel(session: GameSession, targetNodeId: string) {
  const next = cloneSession(session)
  const travel = getTravelOption(next, targetNodeId)
  if (!travel.available || !travel.target) return next
  next.world.pendingPlan = { type: 'travel', targetNodeId }
  addLog(next, `已拟定行程：下回合${travel.kind === 'explore' ? '探索并前往' : '前往'} ${travel.target.name}。`)
  return next
}

export function establishBranch(session: GameSession) {
  const next = cloneSession(session)
  const node = getCurrentNode(next)
  if (node.type !== 'town' || node.discovery !== 'confirmed' || node.branchId) return next
  const cost = 180 + (node.prosperity ?? 0) * 30
  if (next.player.spiritStone < cost) return next
  next.player.spiritStone -= cost
  const branchId = `branch-${node.id}`
  node.branchId = branchId
  next.guild.branches.push({ id: branchId, nodeId: node.id, buildingIds: [] })
  addLog(next, `你在 ${node.name} 设立了商号。`)
  return next
}

export function donateToCity(session: GameSession) {
  const next = cloneSession(session)
  const node = getCurrentNode(next)
  if (node.type !== 'town') return next
  const amount = 100
  if (next.player.spiritStone < amount) return next
  next.player.spiritStone -= amount
  node.prosperity = Math.min(10, (node.prosperity ?? 0) + 1)
  addLog(next, `你向 ${node.name} 捐赠了一百灵石，繁荣度提升至 ${node.prosperity}。`)
  return next
}

export function buildBranchBuilding(session: GameSession, nodeId: string, type: BuildingType) {
  const next = cloneSession(session)
  const branch = getBranch(next, nodeId)
  const node = getNode(next, nodeId)
  if (!branch || !node || getBuilding(branch, next, type)) return next
  const costMap: Record<BuildingType, number> = { hub: 120, alchemy: 150, forge: 160, sigil: 150, auction: 220 }
  const cost = costMap[type] + (node.prosperity ?? 0) * 20
  if (next.player.spiritStone < cost) return next
  next.player.spiritStone -= cost
  const buildingId = `${type}-${nodeId}`
  next.guild.buildings.push({ id: buildingId, type, level: 1, enabled: true })
  branch.buildingIds.push(buildingId)
  addLog(next, `商号新建了 ${type === 'hub' ? '集散行' : type === 'alchemy' ? '丹房' : type === 'forge' ? '器坊' : type === 'sigil' ? '符坊' : '拍卖行'}。`)
  return next
}

export function createTradeLink(session: GameSession, targetNodeId: string) {
  const next = cloneSession(session)
  const current = getCurrentNode(next)
  if (!getBranch(next, current.id) || !getBranch(next, targetNodeId) || next.guild.tradeLinks.length >= next.player.tradeLinkCapacity) return next
  if (!hasPath(next, current.id, targetNodeId)) return next
  if (next.guild.tradeLinks.some((link) => [link.fromNodeId, link.toNodeId].includes(current.id) && [link.fromNodeId, link.toNodeId].includes(targetNodeId))) return next
  next.guild.tradeLinks.push({
    id: `link-${current.id}-${targetNodeId}`,
    fromNodeId: current.id,
    toNodeId: targetNodeId,
    maintenanceCost: next.config.economy.tradeLinkMaintenance,
  })
  addLog(next, `商会开辟了 ${getNode(next, current.id)?.name} 与 ${getNode(next, targetNodeId)?.name} 间的贸易连接。`)
  return next
}

export function createTradeLinkBetween(session: GameSession, fromNodeId: string, toNodeId: string) {
  const next = cloneSession(session)
  const fromBranch = getBranch(next, fromNodeId)
  const toBranch = getBranch(next, toNodeId)
  if (!fromBranch || !toBranch || next.guild.tradeLinks.length >= next.player.tradeLinkCapacity) return next
  if (!hasPath(next, fromNodeId, toNodeId)) return next
  const exists = next.guild.tradeLinks.some(
    (link) => [link.fromNodeId, link.toNodeId].includes(fromNodeId) && [link.fromNodeId, link.toNodeId].includes(toNodeId),
  )
  if (exists) return next
  next.guild.tradeLinks.push({
    id: `link-${fromNodeId}-${toNodeId}`,
    fromNodeId,
    toNodeId,
    maintenanceCost: next.config.economy.tradeLinkMaintenance,
  })
  addLog(next, `商会开辟了 ${getNode(next, fromNodeId)?.name} 与 ${getNode(next, toNodeId)?.name} 间的贸易连接。`)
  return next
}

export function removeTradeLink(session: GameSession, linkId: string) {
  const next = cloneSession(session)
  const idx = next.guild.tradeLinks.findIndex((link) => link.id === linkId)
  if (idx === -1) return next
  const [removed] = next.guild.tradeLinks.splice(idx, 1)
  const from = getNode(next, removed.fromNodeId)
  const to = getNode(next, removed.toNodeId)
  addLog(next, `商会取消了 ${from?.name ?? '?'} 与 ${to?.name ?? '?'} 间的商路连接。`)
  return next
}

export function dispatchRetainer(session: GameSession, targetNodeId: string) {
  const next = cloneSession(session)
  const target = getNode(next, targetNodeId)
  const retainer = next.guild.retainers.find((item) => item.status === 'idle')
  if (!target || !retainer || target.discovery !== 'rumor') return next
  target.discovery = 'confirmed'
  target.knownProducts = true
  getAdjacentEdges(next, target.id).forEach((edge) => {
    const otherId = edge.fromNodeId === target.id ? edge.toNodeId : edge.fromNodeId
    if (getNode(next, otherId)?.discovery === 'confirmed') edge.discovery = 'confirmed'
  })
  retainer.status = 'busy'
  retainer.remainingTurns = 1
  retainer.targetNodeId = target.id
  finalizeTurn(next, `${retainer.name} 代你前往确认了 ${target.name} 的存在。`)
  return next
}

export function scheduleRetainerDispatch(session: GameSession, targetNodeId: string) {
  const next = cloneSession(session)
  const target = getNode(next, targetNodeId)
  const retainer = next.guild.retainers.find((item) => item.status === 'idle')
  if (!target || !retainer || target.discovery !== 'rumor') return next
  next.world.pendingPlan = { type: 'retainer', targetNodeId }
  addLog(next, `已安排 ${retainer.name} 于下回合前往确认 ${target.name}。`)
  return next
}

export function repairGate(session: GameSession) {
  const next = cloneSession(session)
  if (!next.world.finalObjectiveUnlocked || next.world.finalObjectiveCompleted || next.player.spiritStone < 1200) return next
  next.player.spiritStone -= 1200
  next.world.finalObjectiveCompleted = true
  finalizeTurn(next, '商会调集资源修复了灾前传送阵，终局探索目标已完成。')
  return next
}

export function scheduleRepairGate(session: GameSession) {
  const next = cloneSession(session)
  if (!next.world.finalObjectiveUnlocked || next.world.finalObjectiveCompleted || next.player.spiritStone < 1200) return next
  next.world.pendingPlan = { type: 'repair-gate' }
  addLog(next, '已拟定终局工程：下回合投入资源修复传送阵。')
  return next
}

export function clearPendingPlan(session: GameSession) {
  const next = cloneSession(session)
  next.world.pendingPlan = undefined
  addLog(next, '已取消当前回合计划。')
  return next
}

export function describePendingPlan(session: GameSession, plan: TurnPlanState | undefined = session.world.pendingPlan) {
  if (!plan) {
    return {
      title: '无移动计划',
      detail: '若直接过回合，将停留在当前据点修整。',
      actionLabel: '停留修整',
    }
  }

  if (plan.type === 'travel') {
    const travel = plan.targetNodeId ? getTravelOption(session, plan.targetNodeId) : undefined
    const target = travel?.target
    return {
      title: target ? `前往 ${target.name}` : '前往未知目的地',
      detail: target
        ? `${travel?.kind === 'explore' ? '探索并前往' : `移动 ${travel?.steps ?? '?'} 段已知道路`}，预计耗费 ${travel?.cost ?? '?'} 灵石。`
        : '当前计划目标已失效。',
      actionLabel: target ? `执行行程：${target.name}` : '执行行程',
    }
  }

  if (plan.type === 'retainer') {
    const target = plan.targetNodeId ? getNode(session, plan.targetNodeId) : undefined
    const retainer = session.guild.retainers.find((item) => item.status === 'idle')
    return {
      title: target ? `供奉确认 ${target.name}` : '供奉外出确认',
      detail: retainer
        ? `${retainer.name} 将在下回合代你前往目标据点确认情报。`
        : '当前暂无空闲供奉，执行时可能失败。',
      actionLabel: target ? `执行代办：${target.name}` : '执行代办',
    }
  }

  return {
    title: '修复传送阵',
    detail: '下回合投入 1200 灵石，推进终局工程。',
    actionLabel: '执行终局工程',
  }
}

export function executePendingPlan(session: GameSession) {
  const plan = session.world.pendingPlan
  if (!plan) {
    const next = cloneSession(session)
    finalizeTurn(next, `你停留在 ${getCurrentNode(next).name} 修整了一回合。`)
    return next
  }

  if (plan.type === 'travel' && plan.targetNodeId) return moveOrExplore(session, plan.targetNodeId)
  if (plan.type === 'retainer' && plan.targetNodeId) return dispatchRetainer(session, plan.targetNodeId)
  if (plan.type === 'repair-gate') return repairGate(session)

  const next = cloneSession(session)
  finalizeTurn(next, '原定计划未能执行，你将这一回合用于整顿商会事务。')
  return next
}

function findConfirmedPathWithinMoveRange(session: GameSession, fromId: string, toId: string, maxSteps: number) {
  if (fromId === toId) return []
  const queue: Array<{ nodeId: string; edges: EdgeState[] }> = [{ nodeId: fromId, edges: [] }]
  const bestSteps = new Map([[fromId, 0]])

  while (queue.length) {
    const current = queue.shift()!
    if (current.edges.length >= maxSteps) continue

    for (const edge of getAdjacentEdges(session, current.nodeId).filter((item) => item.discovery === 'confirmed')) {
      const nextId = edge.fromNodeId === current.nodeId ? edge.toNodeId : edge.fromNodeId
      const nextEdges = [...current.edges, edge]
      if ((bestSteps.get(nextId) ?? Number.POSITIVE_INFINITY) <= nextEdges.length) continue
      if (nextId === toId) return nextEdges
      bestSteps.set(nextId, nextEdges.length)
      queue.push({ nodeId: nextId, edges: nextEdges })
    }
  }

  return undefined
}

export function getMoveRangeReachableNodeIds(session: GameSession) {
  const current = getCurrentNode(session)
  const reachable = new Set<string>()
  const queue: Array<{ nodeId: string; steps: number }> = [{ nodeId: current.id, steps: 0 }]
  const bestSteps = new Map([[current.id, 0]])

  while (queue.length) {
    const { nodeId, steps } = queue.shift()!
    if (steps >= session.player.moveRange) continue

    for (const edge of getAdjacentEdges(session, nodeId).filter((item) => item.discovery === 'confirmed')) {
      const nextId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId
      const nextSteps = steps + 1
      if ((bestSteps.get(nextId) ?? Number.POSITIVE_INFINITY) <= nextSteps) continue
      const node = getNode(session, nextId)
      if (node?.discovery === 'confirmed') reachable.add(nextId)
      bestSteps.set(nextId, nextSteps)
      queue.push({ nodeId: nextId, steps: nextSteps })
    }
  }

  return [...reachable]
}

export function getTravelOption(session: GameSession, targetNodeId: string) {
  const current = getCurrentNode(session)
  const target = getNode(session, targetNodeId)
  if (!target) return { available: false as const, kind: 'unavailable' as const, reason: '目标不存在' }
  if (target.id === current.id) {
    return { available: false as const, kind: 'current' as const, target, reason: '此处即为当前驻留据点。' }
  }

  const directEdge = getEdgeBetween(session, current.id, target.id)
  if (directEdge && directEdge.discovery !== 'hidden') {
    const shouldExplore = directEdge.discovery !== 'confirmed' || target.discovery !== 'confirmed'
    if (shouldExplore) {
      return {
        available: true as const,
        kind: 'explore' as const,
        target,
        edges: [directEdge],
        steps: 1,
        cost: getTravelCost(directEdge),
      }
    }
  }

  if (target.discovery === 'confirmed') {
    const path = findConfirmedPathWithinMoveRange(session, current.id, target.id, session.player.moveRange)
    if (path?.length) {
      return {
        available: true as const,
        kind: 'move' as const,
        target,
        edges: path,
        steps: path.length,
        cost: path.reduce((sum, edge) => sum + getTravelCost(edge), 0),
      }
    }
  }

  if (directEdge?.discovery === 'hidden') {
    return { available: false as const, kind: 'unavailable' as const, target, reason: '尚未获知道路传闻，不能直接探索。' }
  }
  if (target.discovery === 'hidden') {
    return { available: false as const, kind: 'unavailable' as const, target, reason: '此地尚未进入你的情报视野。' }
  }
  return {
    available: false as const,
    kind: 'unavailable' as const,
    target,
    reason: `超出本回合移动范围（当前可跨 ${session.player.moveRange} 段确认道路）。`,
  }
}
