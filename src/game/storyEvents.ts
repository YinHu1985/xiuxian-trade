import type { GameSession } from '@/game/types'

/** 剧情事件 ID 常量 */
export const STORY_EVENTS = {
  INTRO_DIALOG: 'intro_dialog',
  AIRSHIP_INTRO: 'airship_intro',
  MAP_INTRO: 'map_intro',
} as const

/** 标记某个剧情事件为"已触发" */
export function markEventTriggered(session: GameSession, eventId: string): void {
  session.storyFlags[eventId] = true
}

/** 检查某个剧情事件是否已触发 */
export function isEventTriggered(session: GameSession, eventId: string): boolean {
  return !!session.storyFlags[eventId]
}
