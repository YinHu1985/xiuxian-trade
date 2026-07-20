import type { NodeType } from '@/game/types'

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickDeterministic<T>(items: T[], key: string): T {
  return items[hashString(key) % items.length]
}

export const airshipBackgroundUrl = '/images/backgrounds/airship/airship-01.jpg'

export const mapBackgroundUrl = '/images/backgrounds/map/map-parchment-01.jpg'

const nodeBackgroundPools: Record<NodeType, string[]> = {
  town: ['/images/backgrounds/nodes/town/town-01.jpg'],
  sect: ['/images/backgrounds/nodes/sect/sect-01.jpg'],
  ruin: ['/images/backgrounds/nodes/ruin/ruin-01.jpg'],
  special: ['/images/backgrounds/nodes/special/special-01.jpg'],
}

export function getNodeBackgroundUrl(type: NodeType, nodeId: string, worldSeed: number) {
  return pickDeterministic(nodeBackgroundPools[type], `${worldSeed}:${nodeId}:${type}`)
}
