import { useMemo, useState } from 'react'
import { defaultConfig, mergeConfig, presetConfigs } from '@/game/config'
import { useGameStore } from '@/store/gameStore'
import type { GameConfig } from '@/game/types'

type NumericPath = [keyof GameConfig, string]

const fields: { label: string; path: NumericPath; step?: number; min?: number; max?: number }[] = [
  { label: '据点总数', path: ['map', 'nodeCount'], step: 1, min: 12, max: 32 },
  { label: '起始已知邻点', path: ['map', 'knownNeighborCount'], step: 1, min: 2, max: 5 },
  { label: '平均连接度', path: ['map', 'averageConnections'], step: 0.1, min: 1.8, max: 4.2 },
  { label: '总回合数', path: ['progress', 'maxTurns'], step: 1, min: 40, max: 120 },
  { label: '初始灵石', path: ['progress', 'initialSpiritStone'], step: 10, min: 200, max: 1200 },
  { label: '初始货仓', path: ['progress', 'cargoCapacity'], step: 1, min: 4, max: 16 },
  { label: '原产地折扣', path: ['economy', 'originDiscount'], step: 0.05, min: 0.3, max: 0.7 },
  { label: '基础收益系数', path: ['economy', 'baseIncomePerProduct'], step: 1, min: 6, max: 20 },
  { label: '贸易维护费', path: ['economy', 'tradeLinkMaintenance'], step: 1, min: 4, max: 30 },
  { label: '价格冲击', path: ['market', 'tradeImpactPerUnit'], step: 0.005, min: 0.005, max: 0.03 },
  { label: '价格回归', path: ['market', 'modifierRecoveryPerTurn'], step: 0.01, min: 0.01, max: 0.12 },
  { label: '打听成功率', path: ['exploration', 'tavernSuccessRate'], step: 0.05, min: 0.2, max: 1 },
]

const presetGuildNames = ['太虚商会', '万宝楼', '天机阁', '四海行', '青云商盟', '流云会', '九鼎楼', '归真阁']

export default function NewGamePage({ onNavigate }: { onNavigate: (page: 'game' | 'newGame' | 'saves') => void }) {
  const createSession = useGameStore((state) => state.createSession)
  const [config, setConfig] = useState<GameConfig>(defaultConfig)
  const [guildName, setGuildName] = useState('太虚商会')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const presets = useMemo(() => Object.entries(presetConfigs), [])

  function applyPreset(key: string) {
    setConfig(mergeConfig(defaultConfig, presetConfigs[key].overrides))
  }

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,83,35,0.18),transparent_24%),linear-gradient(180deg,#22170f,#140d08)] px-6 py-8 text-[#f7edd7]">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(51,35,23,0.97),rgba(29,20,13,0.96))] p-8 shadow-[0_30px_100px_rgba(22,13,7,0.45)]">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/55">新游戏</p>
          <h1 className="mt-4 font-serif text-4xl text-[#fff4dd]">修仙商会开拓许可</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#d9c39f]">
            默认只需在四种典型配置中择其一，再为商会定下名号即可启程。若想微调数值，再展开细节设置慢慢调整。
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[22px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(65,44,28,0.94),rgba(40,27,19,0.92))] p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-amber-100/45">典型配置</div>
              <div className="mt-4 flex flex-wrap gap-3">
                {presets.map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className="rounded-[14px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(90,60,37,0.94),rgba(57,38,25,0.92))] px-4 py-2 text-sm text-[#fff4dd] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[22px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(65,44,28,0.94),rgba(40,27,19,0.92))] p-5">
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
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setDetailsOpen((value) => !value)}
              className="rounded-[14px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-4 py-2 text-sm text-[#ead8ba] transition hover:border-[#c19154]/65 hover:text-[#fff4dd]"
            >
              {detailsOpen ? '收起细节设置' : '展开细节设置'}
            </button>
          </div>
        </header>

        {detailsOpen ? (
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            {fields.map((field) => {
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

        <div className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => {
              createSession(config, guildName.trim() || '太虚商会')
              onNavigate('game')
            }}
            className="rounded-[16px] border border-[#c19154]/45 bg-[linear-gradient(180deg,rgba(122,83,44,0.98),rgba(81,54,29,0.96))] px-6 py-3 text-sm text-[#fff4dd] transition hover:border-[#d8b073] hover:bg-[linear-gradient(180deg,rgba(143,96,50,0.99),rgba(92,62,33,0.97))]"
          >
            开始新局
          </button>
          <button
            type="button"
            onClick={() => onNavigate('saves')}
            className="rounded-[16px] border border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] px-6 py-3 text-sm text-[#ead8ba] transition hover:border-[#c19154]/65 hover:text-[#fff4dd]"
          >
            前往存档管理
          </button>
        </div>
      </div>
    </main>
  )
}
