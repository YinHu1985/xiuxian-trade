import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import MainGamePage from '@/pages/MainGamePage'
import NewGamePage from '@/pages/NewGamePage'
import SavesPage from '@/pages/SavesPage'

export type AppPage = 'game' | 'newGame' | 'saves'

export default function App() {
  const session = useGameStore((state) => state.session)
  const [page, setPage] = useState<AppPage>(session ? 'game' : 'newGame')

  if (page === 'newGame') return <NewGamePage onNavigate={setPage} />
  if (page === 'saves') return <SavesPage onNavigate={setPage} />
  if (!session) return <NewGamePage onNavigate={setPage} />
  return <MainGamePage onNavigate={setPage} />
}
