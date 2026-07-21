import { useEffect, useMemo, useState } from 'react'
import { exportSaveJson, loadSave } from '@/game/save'
import { useGameStore } from '@/store/gameStore'

export default function SavesPage({ onNavigate }: { onNavigate: (page: 'game' | 'newGame' | 'saves') => void }) {
  const saves = useGameStore((state) => state.saves)
  const refreshSaves = useGameStore((state) => state.refreshSaves)
  const loadSaveById = useGameStore((state) => state.loadSaveById)
  const deleteSaveById = useGameStore((state) => state.deleteSaveById)
  const importJson = useGameStore((state) => state.importJson)
  const [rawJson, setRawJson] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    refreshSaves()
  }, [refreshSaves])

  const saveCards = useMemo(() => saves, [saves])

  function download(id: string) {
    const record = loadSave(id)
    if (!record) return
    const blob = new Blob([exportSaveJson(record)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${record.meta.title}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(120,53,15,0.18),transparent_24%),linear-gradient(180deg,#22170f,#140d08)] px-6 py-8 text-[#f7edd7]">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/55">存档</p>
          <h1 className="mt-4 font-serif text-4xl text-[#fff4dd]">本地存档与 JSON 管理</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d9c39f]">
            支持本地读档、多存档位，以及 JSON 导入导出。导入时会自动校验基础结构并写回本地存档列表。
          </p>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            {saveCards.length ? (
              saveCards.map((save) => (
                <article key={save.id} className="rounded-[24px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-xl text-[#fff4dd]">{save.title}</h2>
                      <p className="mt-2 text-sm text-[#cdb48a]">
                        回合 {save.turn} · 灵石 {save.spiritStone} · 已确认据点 {save.exploredNodes}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="action" onClick={() => { loadSaveById(save.id); onNavigate('game') }}>读取</button>
                      <button className="action" onClick={() => download(save.id)}>导出</button>
                      <button className="action" onClick={() => deleteSaveById(save.id)}>删除</button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#7a5a36]/40 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-10 text-sm text-[#cdb48a]">
                当前没有本地存档。先开始一局并在主界面保存。
              </div>
            )}
          </div>

          <section className="rounded-[24px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-5">
            <h2 className="font-serif text-xl text-[#fff4dd]">导入 JSON</h2>
            <textarea
              className="mt-4 h-80 w-full rounded-[20px] border border-[#7a5a36]/40 bg-[linear-gradient(180deg,rgba(42,28,18,0.95),rgba(30,20,13,0.93))] p-4 text-sm text-[#e6d3b0] outline-none placeholder:text-[#cdb48a]"
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              placeholder="将导出的存档 JSON 粘贴到这里"
            />
            <div className="mt-4 flex gap-2">
              <button
                className="action"
                onClick={() => {
                  try {
                    importJson(rawJson)
                    refreshSaves()
                    setMessage('导入成功，已写入本地存档。')
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : '导入失败。')
                  }
                }}
              >
                导入
              </button>
              <button className="action" onClick={() => onNavigate('newGame')}>新开一局</button>
            </div>
            {message ? <p className="mt-4 text-sm text-amber-100">{message}</p> : null}
          </section>
        </section>
      </div>
    </main>
  )
}
