import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { initSfx, playMusic, playNodeMusic, playSfx, stopMusic } from '@/game/sound'
import MainGamePage from '@/pages/MainGamePage'
import NewGamePage from '@/pages/NewGamePage'
import SavesPage from '@/pages/SavesPage'

export type AppPage = 'game' | 'newGame' | 'saves'

export default function App() {
  const session = useGameStore((state) => state.session)
  const [page, setPage] = useState<AppPage>(session ? 'game' : 'newGame')

  // 全局音乐管控：App 是唯一播放决策点
  useEffect(() => {
    initSfx()
    if (page === 'game' && session) {
      // 游戏中按当前节点类型播放
      const type = session.player.currentNodeId
        ? session.world.nodes.find((n) => n.id === session.player.currentNodeId)?.type
        : 'town'
      playNodeMusic(type ?? 'town')
    } else {
      // 非游戏页面播放主题曲
      playMusic('main')
    }
  }, [page, session])
  // App 卸载时清理
  useEffect(() => () => stopMusic(), [])

  // 全局按钮点击音效：默认 'click'，可通过 data-sfx 覆盖
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button')
      if (!btn || btn.disabled) return
      playSfx((btn as HTMLElement).dataset.sfx || 'click')
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  if (page === 'newGame') return <NewGamePage onNavigate={setPage} />
  if (page === 'saves') return <SavesPage onNavigate={setPage} />
  if (!session) return <NewGamePage onNavigate={setPage} />
  return <MainGamePage onNavigate={setPage} />
}
