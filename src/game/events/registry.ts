import type { StoryEvent } from '@/game/types'
import { introEvents } from '@/game/events/introEvents'
import { airshipEvents } from '@/game/events/airshipEvents'
import { mapEvents } from '@/game/events/mapEvents'
import { ruinEvents } from '@/game/events/ruinEvents'

let registry: StoryEvent[] | null = null

/**
 * 获取所有已注册的静态事件（引导、介绍类）。
 * 剧情事件（arrive 触发）在生成地图时由 distributeEvents 分配到具体据点。
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
