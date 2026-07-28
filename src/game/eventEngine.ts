import { getEventRegistry } from '@/game/events/registry'
import { productMap } from '@/game/data'
import type {
  EventCondition,
  EventEffect,
  GameSession,
  PendingEvent,
  StoryEvent,
  StoryStep,
  TriggerType,
} from '@/game/types'

/* ====================== 条件判断 ====================== */

function checkFieldConditions(session: GameSession, condition: EventCondition): boolean {
  // 一次性 flag 检查：start flag 已设 = 已触发过
  // 不需要额外处理，在事件筛选时由 getAvailableEvents 处理

  if (condition.flagsRequired?.length) {
    for (const flag of condition.flagsRequired) {
      if (!session.storyFlags[flag]) return false
    }
  }

  if (condition.flagsBlocked?.length) {
    for (const flag of condition.flagsBlocked) {
      if (session.storyFlags[flag]) return false
    }
  }

  if (condition.itemsRequired?.length) {
    for (const item of condition.itemsRequired) {
      if (!session.player.items.some((i) => i.name === item && i.count > 0)) return false
    }
  }

  if (condition.cargoRequired?.length) {
    for (const productId of condition.cargoRequired) {
      if (!session.player.cargo.some((c) => c.productId === productId)) return false
    }
  }

  if (condition.spiritStoneMin !== undefined && session.player.spiritStone < condition.spiritStoneMin) return false
  if (condition.spiritStoneMax !== undefined && session.player.spiritStone > condition.spiritStoneMax) return false
  if (condition.turnMin !== undefined && session.world.currentTurn < condition.turnMin) return false
  if (condition.turnMax !== undefined && session.world.currentTurn > condition.turnMax) return false
  if (condition.nodeType && session.world.nodes.find((n) => n.id === session.player.currentNodeId)?.type !== condition.nodeType) return false
  if (condition.nodeId && session.player.currentNodeId !== condition.nodeId) return false
  if (condition.randomChance !== undefined && Math.random() >= condition.randomChance) return false

  return true
}

/* ====================== 效果执行 ====================== */

function applyEffect(session: GameSession, effect: EventEffect): void {
  switch (effect.type) {
    case 'set_flag':
      if (effect.flag) session.storyFlags[effect.flag] = true
      break
    case 'clear_flag':
      if (effect.flag) delete session.storyFlags[effect.flag]
      break
    case 'add_spirit_stone':
      session.player.spiritStone += effect.amount ?? 0
      break
    case 'remove_spirit_stone':
      session.player.spiritStone = Math.max(0, session.player.spiritStone - (effect.amount ?? 0))
      break
    case 'add_item': {
      if (!effect.itemName) break
      const existing = session.player.items.find((i) => i.name === effect.itemName && i.stackable)
      if (existing) {
        existing.count += 1
      } else {
        session.player.items.push({
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: effect.itemName,
          stackable: true,
          count: 1,
        })
      }
      break
    }
    case 'remove_item': {
      if (!effect.itemName) break
      const idx = session.player.items.findIndex((i) => i.name === effect.itemName && i.count > 0)
      if (idx === -1) break
      const item = session.player.items[idx]
      if (item.count > 1) {
        item.count -= 1
      } else {
        session.player.items.splice(idx, 1)
      }
      break
    }
    case 'add_cargo': {
      if (!effect.productId) break
      const price = effect.amount ?? 0
      session.player.cargo.push({
        id: `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        productId: effect.productId,
        purchasedAtNodeId: session.player.currentNodeId,
        cost: price,
      })
      break
    }
    case 'remove_cargo': {
      if (!effect.productId) break
      const match = session.player.cargo.find((c) => c.productId === effect.productId)
      if (!match) break
      const ci = session.player.cargo.indexOf(match)
      session.player.cargo.splice(ci, 1)
      break
    }
    case 'repair_airship':
      session.player.airshipDurability = session.player.airshipMaxDurability
      break
    case 'damage_airship':
      session.player.airshipDurability = Math.max(0, session.player.airshipDurability - (effect.amount ?? 10))
      break
    case 'add_crew': {
      const add = Math.min(effect.amount ?? 5, session.player.airshipMaxCrew - session.player.airshipCrew)
      session.player.airshipCrew += add
      break
    }
    case 'remove_crew': {
      const remove = Math.min(effect.amount ?? 5, session.player.airshipCrew)
      session.player.airshipCrew -= remove
      break
    }
    case 'set_prosperity': {
      const node = session.world.nodes.find((n) => n.id === (effect.flag ? effect.flag : session.player.currentNodeId))
      if (node && effect.amount !== undefined) node.prosperity = effect.amount
      break
    }
    case 'start_combat':
      // combat is handled by UI, not by engine
      // this effect just sets a flag; the UI checks for it
      if (effect.flag) session.storyFlags[effect.flag] = true
      // 记录事件 ID，战斗结束后触发 battle_end 事件
      session.world.pendingBattleEventId = session.world.pendingEvent?.eventId
      break
  }
}

/* ====================== 事件筛选 ====================== */

function getEventById(id: string, session?: GameSession): StoryEvent | undefined {
  const fromStatic = getEventRegistry().find((ev) => ev.id === id)
  if (fromStatic) return fromStatic
  return session?.world.generatedEvents?.find((ev) => ev.id === id)
}

function getAvailableEvents(
  trigger: TriggerType,
  session: GameSession,
  context?: Record<string, unknown>,
): StoryEvent[] {
  const allEvents = [
    ...getEventRegistry(),
    ...(session.world.generatedEvents ?? []),
  ]
  const events = allEvents.filter((ev) => {
    if (ev.trigger !== trigger) return false
    // 过滤 start flag：已开始的事件不可重复触发
    if (ev.flagOnStart && session.storyFlags[ev.flagOnStart]) return false
    // 非可重复事件：完成标志已设则跳过
    if (!ev.repeatable && session.storyFlags[`${ev.id}_done`]) return false
    // 检查条件
    if (!checkFieldConditions(session, ev.condition)) return false
    // triggerFilter
    if (ev.triggerFilter?.nodeType) {
      const node = session.world.nodes.find((n) => n.id === session.player.currentNodeId)
      if (node?.type !== ev.triggerFilter.nodeType) return false
    }
    if (ev.triggerFilter?.actionType) {
      if (context?.actionType !== ev.triggerFilter.actionType) return false
    }
    if (ev.triggerFilter?.battleResult) {
      if (context?.battleResult !== ev.triggerFilter.battleResult) return false
    }
    return true
  })

  // 按 priority 降序排列，取最高
  events.sort((a, b) => b.priority - a.priority)
  return events
}

/* ====================== 对外接口 ====================== */

/**
 * 检查是否有事件可触发。如果有，设置 session.world.pendingEvent 并返回第一个步骤。
 * 返回 { event, step, session } 或 null。
 */
export function checkEvents(
  trigger: TriggerType,
  session: GameSession,
  _context?: Record<string, unknown>,
): { event: StoryEvent; step: StoryStep; session: GameSession } | null {
  const candidates = getAvailableEvents(trigger, session, _context)
  if (!candidates.length) return null

  const event = candidates[0]
  const next = structuredClone(session)

  // 设 start flag（防内部重复触发）
  if (event.flagOnStart) {
    next.storyFlags[event.flagOnStart] = true
  }

  const step = event.steps[0]
  next.world.pendingEvent = { eventId: event.id, stepIndex: 0 }
  return { event, step, session: next }
}

/**
 * 推进当前事件到下一步。如果事件结束，清空 pendingEvent 并执行 onComplete。
 * 返回 { step（null=结束）, done（是否整个事件结束了）, session }。
 */
export function advanceEvent(
  session: GameSession,
  choiceIndex?: number,
): { step: StoryStep | null; done: boolean; session: GameSession } {
  const pe = session.world.pendingEvent
  if (!pe) return { step: null, done: true, session }

  const event = getEventById(pe.eventId, session)
  if (!event) {
    session.world.pendingEvent = undefined
    return { step: null, done: true, session }
  }

  const next = structuredClone(session)
  const currentStep = event.steps[pe.stepIndex]

  // 1. 执行当前步骤的效果
  if (currentStep.effects) {
    currentStep.effects.forEach((effect) => applyEffect(next, effect))
  }

  // 2. 如果有 choiceIndex，执行该选项的效果
  if (choiceIndex !== undefined && currentStep.choices?.[choiceIndex]) {
    const choice = currentStep.choices[choiceIndex]
    if (choice.effects) {
      choice.effects.forEach((effect) => applyEffect(next, effect))
    }
    // gotoStep 跳转
    if (choice.gotoStep !== undefined) {
      const targetStep = event.steps[choice.gotoStep]
      if (targetStep) {
        next.world.pendingEvent = { eventId: pe.eventId, stepIndex: choice.gotoStep }
        return { step: targetStep, done: false, session: next }
      }
    }
  }

  // 3. 推进 stepIndex
  const nextStepIndex = pe.stepIndex + 1

  // 3a. 还有下一步
  if (nextStepIndex < event.steps.length) {
    const nextStep = event.steps[nextStepIndex]
    next.world.pendingEvent = { eventId: pe.eventId, stepIndex: nextStepIndex }
    return { step: nextStep, done: false, session: next }
  }

  // 3b. 事件结束
  next.world.pendingEvent = undefined
  if (event.onComplete) {
    event.onComplete.forEach((effect) => applyEffect(next, effect))
  }
  // 标记完成
  next.storyFlags[`${event.id}_done`] = true

  return { step: null, done: true, session: next }
}

/**
 * 将程序生成的事件注册到 session 中，使其参与事件筛选和存档
 */
export function registerGeneratedEvents(session: GameSession, events: StoryEvent[]): GameSession {
  const next = structuredClone(session)
  next.world.generatedEvents = [...(next.world.generatedEvents ?? []), ...events]
  return next
}

/**
 * 手动启动指定事件（用于 UI 驱动的触发，如视图切换）
 */
export function tryStartEvent(
  eventId: string,
  session: GameSession,
): { event: StoryEvent; step: StoryStep; session: GameSession } | null {
  const event = getEventById(eventId, session)
  if (!event) return null
  if (!checkFieldConditions(session, event.condition)) return null
  if (!event.repeatable && session.storyFlags[`${event.id}_done`]) return null
  if (event.flagOnStart && session.storyFlags[event.flagOnStart]) return null

  const next = structuredClone(session)
  if (event.flagOnStart) next.storyFlags[event.flagOnStart] = true
  next.world.pendingEvent = { eventId: event.id, stepIndex: 0 }
  return { event, step: event.steps[0], session: next }
}

/**
 * 构建 dialogConfig 对象供 UI 渲染
 */
export function buildDialogConfig(
  step: StoryStep,
  onAdvance: (choiceIndex?: number) => void,
): {
  mode?: import('@/game/types').DialogMode
  title: string
  content: string
  portraitUrl?: string
  characterName?: string
  imageUrl?: string
  buttons: { label: string; onClick: () => void }[]
} {
  const buttons = step.choices?.length
    ? step.choices.map((choice, i) => ({
        label: choice.label,
        onClick: () => onAdvance(i),
      }))
    : [{ label: '继续', onClick: () => onAdvance() }]

  return {
    mode: step.mode,
    title: step.characterName ?? step.speaker ?? '',
    content: step.content,
    portraitUrl: step.portraitUrl,
    characterName: step.characterName ?? step.speaker,
    imageUrl: step.imageUrl,
    buttons,
  }
}
