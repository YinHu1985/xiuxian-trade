import { useState } from 'react'
import { defaultConfig } from '@/game/config'
import { useGameStore } from '@/store/gameStore'
import type { GameConfig } from '@/game/types'
import SettingsPanel from '@/components/SettingsPanel'

type NumericPath = [keyof GameConfig, string]

type PageMode = 'landing' | 'newGame'

const defaultFields: { label: string; path: NumericPath; step?: number; min?: number; max?: number }[] = [
  { label: '据点总数', path: ['map', 'nodeCount'], step: 1, min: 12, max: 50 },
  { label: '总回合数', path: ['progress', 'maxTurns'], step: 1, min: 40, max: 200 },
]

const advancedFields: { label: string; path: NumericPath; step?: number; min?: number; max?: number }[] = [
  { label: '起始已知邻点', path: ['map', 'knownNeighborCount'], step: 1, min: 2, max: 5 },
  { label: '平均连接度', path: ['map', 'averageConnections'], step: 0.1, min: 1.8, max: 4.2 },
  { label: '初始灵石', path: ['progress', 'initialSpiritStone'], step: 10, min: 200, max: 1200 },
  { label: '原产地折扣', path: ['economy', 'originDiscount'], step: 0.05, min: 0.3, max: 0.7 },
  { label: '基础收益系数', path: ['economy', 'baseIncomePerProduct'], step: 1, min: 6, max: 20 },
  { label: '贸易维护费', path: ['economy', 'tradeLinkMaintenance'], step: 1, min: 4, max: 30 },
  { label: '价格冲击', path: ['market', 'tradeImpactPerUnit'], step: 0.005, min: 0.005, max: 0.03 },
  { label: '价格回归', path: ['market', 'modifierRecoveryPerTurn'], step: 0.01, min: 0.01, max: 0.12 },
  { label: '打听成功率', path: ['exploration', 'tavernSuccessRate'], step: 0.05, min: 0.2, max: 1 },
]

const presetGuildNames = ['太虚商会', '万宝楼', '天机阁', '四海行', '青云商盟', '流云会', '九鼎楼', '归真阁']

const base = import.meta.env.BASE_URL
const landingBgUrl = `${base}images/landing-bg.jpg`

export default function NewGamePage({ onNavigate }: { onNavigate: (page: 'game' | 'newGame' | 'saves') => void }) {
  const createSession = useGameStore((state) => state.createSession)
  const [mode, setMode] = useState<PageMode>('landing')
  const [config, setConfig] = useState<GameConfig>(defaultConfig)
  const [guildName, setGuildName] = useState('太虚商会')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  function updateField([group, key]: NumericPath, value: number) {
    setConfig((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }))
  }

  function randomizeGuildName() {
    setGuildName(presetGuildNames[Math.floor(Math.random() * presetGuildNames.length)])
  }

  function handleStart() {
    createSession(config, guildName.trim() || '太虚商会')
    onNavigate('game')
  }

  /* ======================= Landing ======================= */
  if (mode === 'landing') {
    return (
      <main className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Full-screen background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${landingBgUrl}")` }}
        />
        {/* Light overlay — just enough for text readability */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Title — top-left */}
        <div className="relative z-10 px-10 pt-10">
          <p className="text-xs uppercase tracking-[0.45em] text-white/65">天地为局 · 商路为棋</p>
          <h1 className="mt-2 font-serif text-6xl text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            修仙商会开拓
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/75 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            天灾之后，碎片疆域上商机暗涌。领一份开拓许可，从一艘飞舟开始。
          </p>
        </div>

        {/* Buttons — bottom-center, horizontal */}
        <div className="relative z-10 mt-auto flex justify-center gap-4 px-6 pb-10">
          <button
            type="button"
            onClick={() => setMode('newGame')}
            className="w-48 rounded-[16px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-6 py-3.5 text-sm text-[#ead8ba] shadow-[0_10px_24px_rgba(20,11,5,0.24)] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(88,58,35,0.95),rgba(54,36,24,0.94))] hover:text-[#fff4dd]"
          >
            开始新游戏
          </button>
          <button
            type="button"
            onClick={() => onNavigate('saves')}
            className="w-48 rounded-[16px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-6 py-3.5 text-sm text-[#ead8ba] shadow-[0_10px_24px_rgba(20,11,5,0.24)] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(88,58,35,0.95),rgba(54,36,24,0.94))] hover:text-[#fff4dd]"
          >
            读取游戏
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-48 rounded-[16px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-6 py-3.5 text-sm text-[#ead8ba] shadow-[0_10px_24px_rgba(20,11,5,0.24)] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(88,58,35,0.95),rgba(54,36,24,0.94))] hover:text-[#fff4dd]"
          >
            选项
          </button>
        </div>

        {/* Settings overlay */}
        {settingsOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
            <div className="w-[420px] rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-6 shadow-[0_30px_100px_rgba(22,13,7,0.45)]">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/55">选项</p>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#7e5d39]/55 text-amber-100/70 transition hover:border-[#c59a5f]/60 hover:text-[#fff4dd]"
                >
                  ✕
                </button>
              </div>
              <div className="mt-5">
                <SettingsPanel />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    )
  }

  /* ======================= New Game Config ======================= */
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,83,35,0.18),transparent_24%),linear-gradient(180deg,#22170f,#140d08)] px-6 py-8 text-[#f7edd7]">
      <div className="mx-auto max-w-4xl">
        <header className="rounded-[28px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-8 shadow-[0_30px_100px_rgba(22,13,7,0.45)]">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/55">新游戏 · 开拓准备</p>
          <h1 className="mt-4 font-serif text-4xl text-[#fff4dd]">修仙商会开拓</h1>

          {/* 商会名号 */}
          <div className="mt-6 rounded-[22px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(65,44,28,0.94),rgba(40,27,19,0.92))] p-5">
            <div className="text-xs uppercase tracking-[0.3em] text-amber-100/45">商会名号</div>
            <div className="mt-4 flex gap-3">
              <input
                value={guildName}
                onChange={(event) => setGuildName(event.target.value)}
                placeholder="请输入商会名号"
                className="min-w-0 flex-1 rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(88,58,35,0.92),rgba(56,37,24,0.9))] px-4 py-3 text-sm text-[#fff4dd] outline-none placeholder:text-[#cdb48a]"
              />
              <button
                type="button"
                onClick={randomizeGuildName}
                className="shrink-0 rounded-[14px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(90,60,37,0.94),rgba(57,38,25,0.92))] px-4 py-3 text-sm text-[#fff4dd] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))]"
              >
                随机
              </button>
            </div>
            <p className="mt-3 text-sm text-[#cdb48a]">开局后会显示在左上角牌匾处，并随存档一并保留。</p>
          </div>

          {/* 核心参数 */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {defaultFields.map((field) => {
              const [group, key] = field.path
              const value = config[group][key as keyof (typeof config)[typeof group]] as number
              return (
                <label key={`${group}-${key}`} className="rounded-[22px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(65,44,28,0.94),rgba(40,27,19,0.92))] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[#ead8ba]">{field.label}</span>
                    <span className="rounded-full border border-[#7c5c39]/45 px-3 py-1 text-sm text-amber-100">{value}</span>
                  </div>
                  <input
                    className="mt-4 w-full accent-amber-300"
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value}
                    onChange={(event) => updateField(field.path, Number(event.target.value))}
                  />
                </label>
              )
            })}
          </div>

          {/* 高级设置 */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setAdvancedOpen((value) => !value)}
              className="rounded-[14px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-4 py-2 text-sm text-[#ead8ba] transition hover:border-[#c19154]/65 hover:text-[#fff4dd]"
            >
              {advancedOpen ? '收起高级设置' : '展开高级设置'}
            </button>
          </div>

          {advancedOpen ? (
            <section className="mt-6 grid gap-4 md:grid-cols-2">
              {advancedFields.map((field) => {
                const [group, key] = field.path
                const value = config[group][key as keyof (typeof config)[typeof group]] as number
                return (
                  <label key={`${group}-${key}`} className="rounded-[22px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-[#ead8ba]">{field.label}</span>
                      <span className="rounded-full border border-[#7c5c39]/45 px-3 py-1 text-sm text-amber-100">{value}</span>
                    </div>
                    <input
                      className="mt-4 w-full accent-amber-300"
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={value}
                      onChange={(event) => updateField(field.path, Number(event.target.value))}
                    />
                  </label>
                )
              })}
            </section>
          ) : null}

          {/* 按钮区 */}
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleStart}
              className="rounded-[16px] border border-[#c19154]/45 bg-[linear-gradient(180deg,rgba(122,83,44,0.98),rgba(81,54,29,0.96))] px-6 py-3 text-sm text-[#fff4dd] transition hover:border-[#d8b073] hover:bg-[linear-gradient(180deg,rgba(143,96,50,0.99),rgba(92,62,33,0.97))]"
            >
              开始新局
            </button>
            <button
              type="button"
              onClick={() => setMode('landing')}
              className="rounded-[16px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-6 py-3 text-sm text-[#ead8ba] transition hover:border-[#c19154]/65 hover:text-[#fff4dd]"
            >
              返回
            </button>
          </div>
        </header>
      </div>
    </main>
  )
}
