import { describe, expect, it } from 'vitest'
import { defaultConfig } from '@/game/config'
import { craftedCategories, productMap, rawMaterialCategories } from '@/game/data'
import { createNewGame } from '@/game/generator'
import {
  executePendingPlan,
  establishBranch,
  getBranchIncome,
  getBranchProductPool,
  getTradableProducts,
  scheduleConstruction,
  scheduleTravel,
  tavernRumor,
} from '@/game/engine'
import type { NodeState } from '@/game/types'

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

describe('地图生成', () => {
  it('应生成联通基础骨架与起始已知区域', () => {
    const session = createNewGame(undefined, 9527)
    expect(session.world.nodes).toHaveLength(session.config.map.nodeCount)
    expect(session.world.edges.length).toBeGreaterThanOrEqual(session.world.nodes.length - 1)
    expect(session.world.nodes.filter((node) => node.discovery !== 'hidden').length).toBeGreaterThanOrEqual(3)
  })

  it('生成的道路应尽量避免交叉', () => {
    ;[101, 777, 1357, 9527, 20260719].forEach((seed) => {
      const session = createNewGame(undefined, seed)
      const nodeById = new Map(session.world.nodes.map((node) => [node.id, node]))

      for (let leftIndex = 0; leftIndex < session.world.edges.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < session.world.edges.length; rightIndex += 1) {
          const left = session.world.edges[leftIndex]
          const right = session.world.edges[rightIndex]
          const leftFrom = nodeById.get(left.fromNodeId)!
          const leftTo = nodeById.get(left.toNodeId)!
          const rightFrom = nodeById.get(right.fromNodeId)!
          const rightTo = nodeById.get(right.toNodeId)!
          expect(segmentsIntersect(leftFrom, leftTo, rightFrom, rightTo)).toBe(false)
        }
      }
    })
  })

  it('据点应从类型名称池中取显示名，而不是类型加编号', () => {
    const session = createNewGame(undefined, 9527)
    session.world.nodes.forEach((node) => {
      expect(node.name).not.toMatch(/^(城镇|宗门|遗迹|特殊)\d+$/)
      expect(node.name.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('据点特产应按类型规则生成', () => {
    const session = createNewGame(undefined, 20260719)
    session.world.nodes.forEach((node) => {
      expect(node.baseProducts.length).toBeGreaterThan(0)
      node.baseProducts.forEach((productId) => {
        const product = productMap[productId]
        expect(product).toBeTruthy()
        if (node.type === 'sect') {
          expect(craftedCategories).toContain(product.category)
        }
        if (node.type === 'ruin') {
          expect(rawMaterialCategories).toContain(product.category)
        }
        if (node.type === 'town') {
          expect(['qi', 'foundation']).toContain(product.realm)
        }
      })
    })
  })

  it('城镇联通开局应揭示所有城镇与联通主干道，分支保持隐藏', () => {
    const config = { ...defaultConfig, map: { ...defaultConfig.map, openTownsAtStart: true } }
    const session = createNewGame(config, 9527)

    const towns = session.world.nodes.filter((node) => node.type === 'town')
    const startNodeId = session.player.currentNodeId
    const edgeByNode = new Map<string, typeof session.world.edges>()
    session.world.nodes.forEach((node) => edgeByNode.set(node.id, []))
    session.world.edges.forEach((edge) => {
      edgeByNode.get(edge.fromNodeId)!.push(edge)
      edgeByNode.get(edge.toNodeId)!.push(edge)
    })

    // 所有城镇开局可见且已知产物
    towns.forEach((town) => {
      expect(town.discovery).toBe('confirmed')
      expect(town.knownProducts).toBe(true)
    })

    // 从起始城镇沿 confirmed 边可达的节点应覆盖全部城镇
    const reachable = new Set<string>([startNodeId])
    const queue = [startNodeId]
    while (queue.length) {
      const nodeId = queue.shift()!
      edgeByNode.get(nodeId)!.forEach((edge) => {
        const otherId = edge.fromNodeId === nodeId ? edge.toNodeId : edge.fromNodeId
        if (edge.discovery === 'confirmed' && !reachable.has(otherId)) {
          reachable.add(otherId)
          queue.push(otherId)
        }
      })
    }
    towns.forEach((town) => {
      expect(reachable.has(town.id)).toBe(true)
    })

    // 联通主干道构成树：confirmed 边数 = 可达节点数 - 1（无环）
    const confirmedEdges = session.world.edges.filter((edge) => edge.discovery === 'confirmed')
    expect(confirmedEdges.length).toBe(reachable.size - 1)
    // 分支道路保持隐藏：可见边数少于总边数
    expect(confirmedEdges.length).toBeLessThan(session.world.edges.length)
    // 所有可见节点都必须位于联通主干道上，不允许孤立开启的非城镇节点
    const edgeEndpointIds = new Set(confirmedEdges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]))
    session.world.nodes
      .filter((node) => node.discovery === 'confirmed' && node.id !== startNodeId)
      .forEach((node) => {
        expect(edgeEndpointIds.has(node.id)).toBe(true)
      })

    // 非城镇节点不允许以叶子形态出现在主干上（不在任何城镇-城镇路径上就不该被揭示）
    const treeDegree = new Map<string, number>()
    confirmedEdges.forEach((edge) => {
      treeDegree.set(edge.fromNodeId, (treeDegree.get(edge.fromNodeId) ?? 0) + 1)
      treeDegree.set(edge.toNodeId, (treeDegree.get(edge.toNodeId) ?? 0) + 1)
    })
    session.world.nodes
      .filter((node) => node.discovery === 'confirmed' && node.type !== 'town')
      .forEach((node) => {
        expect(treeDegree.get(node.id) ?? 0).toBeGreaterThanOrEqual(2)
      })
  })
})

describe('经营规则', () => {
  it('商号建筑应提升产品池与收益', () => {
    let session = createNewGame(undefined, 777)
    const startNode = session.world.nodes.find((node) => node.id === session.player.currentNodeId)!
    startNode.type = 'town'
    session.player.spiritStone = 5000
    session = establishBranch(session)
    const beforePool = getBranchProductPool(session, startNode.id).length
    const beforeIncome = getBranchIncome(session, startNode.id)
    session = scheduleConstruction(session, startNode.id, 'hub')
    session = executePendingPlan(session)
    session = scheduleConstruction(session, startNode.id, 'auction')
    session = executePendingPlan(session)
    expect(getBranchProductPool(session, startNode.id).length).toBeGreaterThanOrEqual(beforePool)
    expect(getBranchIncome(session, startNode.id)).toBeGreaterThanOrEqual(beforeIncome)
  })

  it('本地可交易物产应包含采集与工坊产物，但商路带来的物产只计入收入池', () => {
    let session = createNewGame(undefined, 9090)
    const startNodeId = session.player.currentNodeId
    const startNode = session.world.nodes.find((node) => node.id === startNodeId)!
    startNode.baseProducts = ['herb-qi']
    startNode.inventory = { 'herb-qi': { quantity: 1, max: 1 } }
    session.player.spiritStone = 5000
    session = establishBranch(session)
    const adjacentEdge = session.world.edges.find((edge) => edge.fromNodeId === startNodeId || edge.toNodeId === startNodeId)!
    const neighborId = adjacentEdge.fromNodeId === startNodeId ? adjacentEdge.toNodeId : adjacentEdge.fromNodeId
    const neighborNode = session.world.nodes.find((node) => node.id === neighborId)!
    neighborNode.baseProducts = ['ore-qi']
    neighborNode.inventory = { 'ore-qi': { quantity: 1, max: 1 } }
    neighborNode.discovery = 'confirmed'
    adjacentEdge.discovery = 'confirmed'

    session = scheduleConstruction(session, startNodeId, 'hub')
    session = executePendingPlan(session)
    session = scheduleConstruction(session, startNodeId, 'alchemy')
    session = executePendingPlan(session)
    const localNode = session.world.nodes.find((node) => node.id === startNodeId)!
    const tradable = getTradableProducts(session, localNode)
    expect(tradable).toEqual(expect.arrayContaining(['herb-qi', 'ore-qi', 'elixir-qi']))

    const otherTown = session.world.nodes.find((node) => node.id !== startNodeId && node.id !== neighborId && node.type === 'town')!
    otherTown.discovery = 'confirmed'
    otherTown.baseProducts = ['pelt-qi']
    otherTown.inventory = { 'pelt-qi': { quantity: 1, max: 1 } }
    session.player.currentNodeId = otherTown.id
    session.world.selectedNodeId = otherTown.id
    session.player.spiritStone = 5000
    session = establishBranch(session)
    session.player.currentNodeId = startNodeId
    session.world.selectedNodeId = startNodeId
    session.guild.tradeLinks.push({
      id: 'link-test',
      fromNodeId: startNodeId,
      toNodeId: otherTown.id,
      maintenanceCost: 0,
    })

    const incomePool = getBranchProductPool(session, startNodeId)
    expect(incomePool).toEqual(expect.arrayContaining(['pelt-qi']))
    expect(getTradableProducts(session, session.world.nodes.find((node) => node.id === startNodeId)!)).toEqual(tradable)
  })

  it('拟定行程后应在执行回合时确认节点并移动主角', () => {
    let session = createNewGame(undefined, 1357)
    const currentNodeId = session.player.currentNodeId
    const target = session.world.edges
      .filter((edge) => edge.fromNodeId === currentNodeId || edge.toNodeId === currentNodeId)
      .map((edge) => {
        const nodeId = edge.fromNodeId === currentNodeId ? edge.toNodeId : edge.fromNodeId
        return session.world.nodes.find((node) => node.id === nodeId)
      })
      .find((node) => node?.discovery !== 'hidden')
    expect(target).toBeTruthy()
    session = scheduleTravel(session, target!.id)
    expect(session.world.pendingPlan?.type).toBe('travel')
    expect(session.player.currentNodeId).toBe(currentNodeId)
    session = executePendingPlan(session)
    expect(session.player.currentNodeId).toBe(target!.id)
    expect(session.world.nodes.find((node) => node.id === target!.id)?.discovery).toBe('confirmed')
    expect(session.world.pendingPlan).toBeUndefined()
  })

  it('移动力大于 1 时应可沿确认道路网络一次移动多段', () => {
    let session = createNewGame(undefined, 8080)
    const currentNodeId = session.player.currentNodeId
    const adjacency = new Map<string, string[]>()
    session.world.edges.forEach((edge) => {
      adjacency.set(edge.fromNodeId, [...(adjacency.get(edge.fromNodeId) ?? []), edge.toNodeId])
      adjacency.set(edge.toNodeId, [...(adjacency.get(edge.toNodeId) ?? []), edge.fromNodeId])
    })

    const firstHopId = adjacency.get(currentNodeId)?.[0]
    expect(firstHopId).toBeTruthy()
    const targetNodeId = adjacency.get(firstHopId!)?.find((nodeId) => nodeId !== currentNodeId)
    expect(targetNodeId).toBeTruthy()

    session.player.moveRange = 2
    session.world.nodes.forEach((node) => {
      if ([currentNodeId, firstHopId, targetNodeId].includes(node.id)) {
        node.discovery = 'confirmed'
        node.knownProducts = true
      }
    })
    session.world.edges.forEach((edge) => {
      const edgeKey = new Set([edge.fromNodeId, edge.toNodeId])
      if (
        edgeKey.has(currentNodeId) &&
        edgeKey.has(firstHopId!)
      ) {
        edge.discovery = 'confirmed'
      }
      if (
        edgeKey.has(firstHopId!) &&
        edgeKey.has(targetNodeId!)
      ) {
        edge.discovery = 'confirmed'
      }
    })

    session = scheduleTravel(session, targetNodeId!)
    expect(session.world.pendingPlan?.type).toBe('travel')
    session = executePendingPlan(session)
    expect(session.player.currentNodeId).toBe(targetNodeId)
  })

  it('无计划执行回合时应原地修整并推进回合', () => {
    let session = createNewGame(undefined, 2468)
    const currentTurn = session.world.currentTurn
    const currentNodeId = session.player.currentNodeId
    session = executePendingPlan(session)
    expect(session.world.currentTurn).toBe(currentTurn + 1)
    expect(session.player.currentNodeId).toBe(currentNodeId)
  })

  it('非城镇地点也应可以打听传闻', () => {
    let session = createNewGame(undefined, 4242)
    const currentNode = session.world.nodes.find((node) => node.id === session.player.currentNodeId)!
    currentNode.type = 'sect'
    const spiritStoneBefore = session.player.spiritStone
    session = tavernRumor(session)
    expect(session.player.spiritStone).toBe(spiritStoneBefore - session.config.exploration.tavernRumorCost)
  })

  it('已知据点对应的未确认道路也应能被打听出来', () => {
    let session = createNewGame(undefined, 5151)
    session.config.exploration.tavernSuccessRate = 1
    const currentNodeId = session.player.currentNodeId
    const adjacent = session.world.edges.find((edge) => edge.fromNodeId === currentNodeId || edge.toNodeId === currentNodeId)
    expect(adjacent).toBeTruthy()
    const targetNodeId = adjacent!.fromNodeId === currentNodeId ? adjacent!.toNodeId : adjacent!.fromNodeId
    const targetNode = session.world.nodes.find((node) => node.id === targetNodeId)!
    session.world.edges.forEach((edge) => {
      if (edge.id !== adjacent!.id && (edge.fromNodeId === currentNodeId || edge.toNodeId === currentNodeId)) {
        edge.discovery = 'confirmed'
      }
    })
    targetNode.discovery = 'rumor'
    targetNode.knownProducts = true
    adjacent!.discovery = 'hidden'

    session = tavernRumor(session)

    const updatedEdge = session.world.edges.find((edge) => edge.id === adjacent!.id)
    expect(updatedEdge?.discovery).toBe('rumor')
  })

  it('未确认道路不应允许直接拟定行程', () => {
    let session = createNewGame(undefined, 6161)
    session.player.moveRange = 3
    const currentNodeId = session.player.currentNodeId
    const adjacent = session.world.edges.find((edge) => edge.fromNodeId === currentNodeId || edge.toNodeId === currentNodeId)
    expect(adjacent).toBeTruthy()
    const targetNodeId = adjacent!.fromNodeId === currentNodeId ? adjacent!.toNodeId : adjacent!.fromNodeId
    const targetNode = session.world.nodes.find((node) => node.id === targetNodeId)!
    targetNode.discovery = 'confirmed'
    adjacent!.discovery = 'hidden'

    session = scheduleTravel(session, targetNodeId)

    expect(session.world.pendingPlan).toBeUndefined()
  })

  it('移动力更高时，探索传闻道路仍只消耗一回合', () => {
    let session = createNewGame(undefined, 7171)
    session.player.moveRange = 3
    const currentTurn = session.world.currentTurn
    const currentNodeId = session.player.currentNodeId
    const adjacent = session.world.edges.find((edge) => edge.fromNodeId === currentNodeId || edge.toNodeId === currentNodeId)
    expect(adjacent).toBeTruthy()
    const targetNodeId = adjacent!.fromNodeId === currentNodeId ? adjacent!.toNodeId : adjacent!.fromNodeId
    const targetNode = session.world.nodes.find((node) => node.id === targetNodeId)!
    targetNode.discovery = 'rumor'
    targetNode.knownProducts = true
    adjacent!.discovery = 'rumor'

    session = scheduleTravel(session, targetNodeId)
    session = executePendingPlan(session)

    expect(session.world.currentTurn).toBe(currentTurn + 1)
    expect(session.player.currentNodeId).toBe(targetNodeId)
    expect(session.world.nodes.find((node) => node.id === targetNodeId)?.discovery).toBe('confirmed')
    expect(session.world.edges.find((edge) => edge.id === adjacent!.id)?.discovery).toBe('confirmed')
  })
})
