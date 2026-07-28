import type { StoryEvent } from '@/game/types'
import { introEvents } from '@/game/events/introEvents'
import { airshipEvents } from '@/game/events/airshipEvents'
import { mapEvents } from '@/game/events/mapEvents'
import { ruinEvents } from '@/game/events/ruinEvents'

let registry: StoryEvent[] | null = null

/**
 * 获取所有已注册的事件。懒加载，首次调用时合并所有事件源。
 */
export function getEventRegistry(): StoryEvent[] {
  if (!registry) {
    registry = [
      ...introEvents,
      ...airshipEvents,
      ...mapEvents,
      ...ruinEvents,
    ]
  }
  return registry
}
