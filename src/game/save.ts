import type { GameSession, SaveMeta, SaveRecord } from '@/game/types'

const SAVE_INDEX_KEY = 'xiuxian-trade-save-index'
const SAVE_PREFIX = 'xiuxian-trade-save:'

function getSummary(session: GameSession, id: string, title: string): SaveMeta {
  const exploredNodes = session.world.nodes.filter((node) => node.discovery === 'confirmed').length
  return {
    id,
    title,
    savedAt: new Date().toISOString(),
    turn: session.world.currentTurn,
    spiritStone: session.player.spiritStone,
    exploredNodes,
  }
}

export function listSaves(): SaveMeta[] {
  const raw = localStorage.getItem(SAVE_INDEX_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as SaveMeta[]
  } catch {
    return []
  }
}

function writeIndex(index: SaveMeta[]) {
  localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index))
}

export function saveGame(session: GameSession, title: string, existingId?: string) {
  const id = existingId ?? crypto.randomUUID()
  const meta = getSummary(session, id, title)
  localStorage.setItem(`${SAVE_PREFIX}${id}`, JSON.stringify({ meta, data: session } satisfies SaveRecord))
  const index = listSaves().filter((item) => item.id !== id)
  writeIndex([meta, ...index].slice(0, 12))
  return meta
}

export function loadSave(id: string) {
  const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SaveRecord
  } catch {
    return null
  }
}

export function deleteSave(id: string) {
  localStorage.removeItem(`${SAVE_PREFIX}${id}`)
  writeIndex(listSaves().filter((item) => item.id !== id))
}

export function exportSaveJson(record: SaveRecord) {
  return JSON.stringify(record, null, 2)
}

export function importSaveJson(raw: string) {
  const parsed = JSON.parse(raw) as Partial<SaveRecord>
  if (!parsed?.meta?.id || !parsed?.data?.version || !parsed.data.world || !parsed.data.player) {
    throw new Error('存档结构不完整，无法导入。')
  }
  saveGame(parsed.data, parsed.meta.title, parsed.meta.id)
  return parsed as SaveRecord
}
