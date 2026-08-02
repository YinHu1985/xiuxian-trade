import { useEffect, useRef, useState } from 'react'
import type { BattleState as BattleData, BattleSide, BattleLogEntry } from '@/game/battle'
import {
  autoDeployPlayer,
  clearCell,
  COMBAT_SKILL_LABELS,
  deployCombatant,
  getDeployedCount,
  isShipDestroyed,
  simulateFullBattle,
} from '@/game/battle'
import type { CombatSkill } from '@/game/types'

const ROW_LABELS = ['後', '中', '前']
const COL_LABELS = ['上', '中', '下']

function getCellLabel(index: number): string {
  return `${ROW_LABELS[Math.floor(index / 3)]}${COL_LABELS[index % 3]}`
}

function cellColor(hp: number, maxHp: number): string {
  const ratio = hp / maxHp
  if (ratio > 0.6) return 'text-emerald-300'
  if (ratio > 0.3) return 'text-amber-300'
  return 'text-red-400'
}

function hpBarColor(hp: number, maxHp: number): string {
  const ratio = hp / maxHp
  if (ratio > 0.6) return 'bg-emerald-500'
  if (ratio > 0.3) return 'bg-amber-500'
  return 'bg-red-500'
}

const SKILL_COLOR: Record<CombatSkill, string> = {
  sword: 'text-amber-300 border-amber-300/40 bg-amber-300/5',
  formation: 'text-sky-300 border-sky-300/40 bg-sky-300/5',
  spirit: 'text-violet-300 border-violet-300/40 bg-violet-300/5',
  ship: 'text-emerald-300 border-emerald-300/40 bg-emerald-300/5',
  body: 'text-red-300 border-red-300/40 bg-red-300/5',
}

function BattleGrid({
  side,
  label,
  isPlayer,
  facing,
  highlightAtk,
  highlightDef,
  visualHp,
  onCellClick,
  showEmptyHint,
}: {
  side: BattleSide
  label: string
  isPlayer: boolean
  facing?: 'attacker' | 'defender'
  highlightAtk?: number | null
  highlightDef?: number | null
  visualHp?: number[]
  onCellClick?: (pos: number) => void
  showEmptyHint?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="mb-2 text-sm uppercase tracking-[0.25em] text-amber-100/70">{label}</p>
      {[0, 1, 2].map((visualRow) => {
        return (
          <div key={visualRow} className="flex gap-1">
            {[0, 1, 2].map((visualCol) => {
              const pos = !facing
                ? visualRow * 3 + visualCol
                : facing === 'defender'
                  ? 6 - 3 * visualCol + visualRow
                  : 3 * visualCol + visualRow
              const cell = side.cells[pos]
              const hp = visualHp ? visualHp[pos] : cell.currentHp
              const isAtk = highlightAtk === pos
              const isDef = highlightDef === pos
              return (
                <button
                  key={pos}
                  type="button"
                  disabled={!isPlayer || cell.type === 'ship'}
                  onClick={() => onCellClick?.(pos)}
                  className={[
                    'relative flex h-[68px] w-[68px] flex-col items-center justify-center rounded-[12px] border text-xs transition',
                    cell.type === 'empty'
                      ? 'border-[#5a4030]/40 bg-[#2a1e14]/50 text-[#6f5539]'
                      : cell.type === 'ship'
                        ? 'border-[#c19154]/60 bg-[linear-gradient(180deg,rgba(99,65,38,0.95),rgba(61,40,25,0.9))] text-[#fff4dd]'
                        : 'border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(67,45,28,0.92),rgba(41,28,19,0.9))] text-[#ead8ba] hover:border-[#c19154]/50',
                    cell.type === 'empty' && showEmptyHint ? 'cursor-pointer ring-1 ring-amber-300/50' : '',
                    isDef ? 'cell-defender' : '',
                    isAtk ? 'cell-attacker' : '',
                  ].join(' ')}
                >
                  {cell.type === 'empty' ? (
                    <span className="text-[10px] opacity-40">{getCellLabel(pos)}</span>
                  ) : (
                    <>
                      <span className="w-full truncate px-1 text-center text-[10px] leading-tight opacity-70">
                        {cell.type === 'ship' ? '飞舟' : cell.name}
                      </span>
                      {cell.skill ? (
                        <span className={`rounded-full border px-1 text-[8px] leading-tight ${SKILL_COLOR[cell.skill]}`}>
                          {COMBAT_SKILL_LABELS[cell.skill]}
                        </span>
                      ) : null}
                      <span className={`text-sm font-bold leading-tight ${cellColor(hp, cell.maxHp)}`}>{hp}</span>
                      <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-[#1a110a]/60">
                        <div
                          className={`h-full rounded-full ${hpBarColor(hp, cell.maxHp)}`}
                          style={{ width: `${(hp / cell.maxHp) * 100}%` }}
                        />
                      </div>
                    </>
                  )}
                  {isAtk ? <span className="projectile-marker">✦</span> : null}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

export function BattleModal({
  battle: initialBattle,
  isDrill = true,
  onClose,
}: {
  battle: BattleData
  isDrill?: boolean
  onClose: (settlement?: { shipDamage: number; battleResult?: 'win' | 'lose'; combatants: BattleData['playerRoster'] }) => void
}) {
  const [data, setData] = useState(initialBattle)
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null)
  const [attackHighlight, setAttackHighlight] = useState<{
    fromPos: number
    toPos: number
    side: 'player' | 'enemy'
  } | null>(null)
  const [animIndex, setAnimIndex] = useState(-1)
  const [visualPlayerHp, setVisualPlayerHp] = useState<number[]>([])
  const [visualEnemyHp, setVisualEnemyHp] = useState<number[]>([])
  const [confirmZeroDeploy, setConfirmZeroDeploy] = useState<false | 'normal' | 'quick'>(false)
  const animLogsRef = useRef<BattleLogEntry[]>([])
  const animFinalRef = useRef<{
    playerSide: BattleSide
    enemySide: BattleSide
    result: 'none' | 'player_victory' | 'enemy_victory'
    roundCount: number
  } | null>(null)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (animIndex < 0) return
    if (animIndex >= animLogsRef.current.length) return

    let cancelled = false
    const log = animLogsRef.current[animIndex]

    setAttackHighlight({ fromPos: log.fromPos, toPos: log.toPos, side: log.side })
    if (log.side === 'player') {
      setVisualEnemyHp(prev => {
        const next = [...prev]
        next[log.toPos] = Math.max(0, next[log.toPos] - log.damage)
        return next
      })
    } else {
      setVisualPlayerHp(prev => {
        const next = [...prev]
        next[log.toPos] = Math.max(0, next[log.toPos] - log.damage)
        return next
      })
    }

    const clearTimer = setTimeout(() => {
      if (!cancelled) setAttackHighlight(null)
    }, 400)

    pauseTimerRef.current = setTimeout(() => {
      if (cancelled) return
      const nextIndex = animIndex + 1
      if (nextIndex >= animLogsRef.current.length) {
        const f = animFinalRef.current
        if (f) {
          setData(prev => {
            prev.playerSide = f.playerSide
            prev.enemySide = f.enemySide
            prev.phase = 'result'
            prev.logs.push(...animLogsRef.current)
            prev.roundIndex = f.roundCount
            return { ...prev }
          })
        }
        setAnimIndex(-1)
        setVisualPlayerHp([])
        setVisualEnemyHp([])
      } else {
        setAnimIndex(nextIndex)
      }
    }, 700)

    return () => {
      cancelled = true
      clearTimeout(clearTimer)
      clearTimeout(pauseTimerRef.current)
    }
  }, [animIndex])

  const selectedCombatant = data.playerRoster.find((u) => u.id === selectedCombatantId) ?? null

  /* ====================== 部署交互 ====================== */

  const handleRosterClick = (unitId: string) => {
    if (data.phase !== 'deploy') return
    const pos = data.playerSide.cells.findIndex((c) => c.combatantId === unitId)
    if (pos >= 0) {
      // 已部署：点击撤下
      clearCell(data.playerSide, pos)
      setData({ ...data })
      return
    }
    setSelectedCombatantId(prev => (prev === unitId ? null : unitId))
  }

  const handleCellClick = (pos: number) => {
    if (data.phase !== 'deploy') return
    const cell = data.playerSide.cells[pos]
    if (cell.type === 'ship') return

    if (selectedCombatant) {
      // 同一人再次点击 = 撤下；否则部署（若已部署于他处，先撤下）
      if (cell.combatantId === selectedCombatant.id) {
        clearCell(data.playerSide, pos)
      } else {
        const existingPos = data.playerSide.cells.findIndex((c) => c.combatantId === selectedCombatant.id)
        if (existingPos >= 0 && existingPos !== pos) clearCell(data.playerSide, existingPos)
        deployCombatant(data.playerSide, pos, selectedCombatant)
      }
      setSelectedCombatantId(null)
      setData({ ...data })
    } else if (cell.type === 'combatant') {
      // 未选中任何 NPC：点击已部署格 = 撤下
      clearCell(data.playerSide, pos)
      setData({ ...data })
    }
  }

  const handleAutoDeploy = () => {
    autoDeployPlayer(data.playerSide, data.playerRoster)
    setSelectedCombatantId(null)
    setData({ ...data })
  }

  /* ====================== 战斗 ====================== */

  const startFight = (skipAnim = false, force = false) => {
    const deployed = getDeployedCount(data.playerSide)
    if (deployed === 0 && !force) return

    const sim = simulateFullBattle(data.playerSide, data.enemySide, data.whoStarts)
    animLogsRef.current = sim.allLogs
    animFinalRef.current = {
      playerSide: sim.finalPlayerSide,
      enemySide: sim.finalEnemySide,
      result: sim.result,
      roundCount: sim.roundCount,
    }

    setVisualPlayerHp(data.playerSide.cells.map(c => c.currentHp))
    setVisualEnemyHp(data.enemySide.cells.map(c => c.currentHp))

    data.phase = 'fighting'
    data.playerDeployedCount = deployed
    setData({ ...data })

    if (skipAnim) {
      const f = animFinalRef.current!
      setData(prev => {
        prev.playerSide = f.playerSide
        prev.enemySide = f.enemySide
        prev.phase = 'result'
        prev.logs.push(...animLogsRef.current)
        prev.roundIndex = f.roundCount
        return { ...prev }
      })
      setAnimIndex(-1)
      setVisualPlayerHp([])
      setVisualEnemyHp([])
    } else {
      setAnimIndex(0)
    }
  }

  const settle = () => {
    if (isDrill) {
      onClose()
      return
    }
    const shipDamage = Math.max(0, data.shipInitialDurability - data.playerSide.cells[4].currentHp)
    const battleResult: 'win' | 'lose' = isShipDestroyed(data.playerSide) ? 'lose' : 'win'
    // 将战斗中损失的耐久回写至编队
    const combatants = data.playerRoster.map((u) => {
      const cell = data.playerSide.cells.find((c) => c.combatantId === u.id)
      return cell ? { ...u, hp: Math.max(0, cell.currentHp) } : u
    })
    onClose({ shipDamage, battleResult, combatants })
  }

  const playerAtk = attackHighlight?.side === 'player' ? attackHighlight.fromPos : null
  const playerDef = attackHighlight?.side === 'enemy' ? attackHighlight.toPos : null
  const enemyAtk = attackHighlight?.side === 'enemy' ? attackHighlight.fromPos : null
  const enemyDef = attackHighlight?.side === 'player' ? attackHighlight.toPos : null

  const deployedCount = getDeployedCount(data.playerSide)
  const fallenCount = data.playerSide.cells.filter(c => c.type === 'combatant' && c.currentHp <= 0).length

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      <div className="relative flex h-[82%] w-[86%] flex-col overflow-hidden rounded-[22px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-6 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
        <style>{`
          @keyframes attack-pulse {
            0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.5); }
            50% { box-shadow: 0 0 20px rgba(251,191,36,0.85), 0 0 40px rgba(251,191,36,0.35); }
          }
          @keyframes hit-flash {
            0%, 100% { box-shadow: 0 0 6px rgba(239,68,68,0.5); }
            50% { box-shadow: 0 0 18px rgba(239,68,68,0.85), 0 0 36px rgba(239,68,68,0.35); }
          }
          @keyframes projectile-fly {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            50% { opacity: 1; transform: translateY(-8px) scale(1.3); }
            100% { opacity: 0; transform: translateY(-16px) scale(0.7); }
          }
          .cell-attacker {
            animation: attack-pulse 0.4s ease-in-out !important;
          }
          .cell-defender {
            animation: hit-flash 0.4s ease-in-out !important;
          }
          .projectile-marker {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            color: #fbbf24;
            filter: drop-shadow(0 0 4px rgba(251,191,36,0.8));
            animation: projectile-fly 0.4s ease-out forwards;
            pointer-events: none;
          }
        `}</style>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isDrill ? '演习模式' : '遭遇战'}</p>
            <h2 className="font-serif text-2xl text-[#fff4dd]">
              {data.phase === 'deploy' && (isDrill ? '部署阵型' : '部署阵型 · 遭遇战')}
              {data.phase === 'fighting' && '战斗中'}
              {data.phase === 'result' && (isDrill ? '演习结束' : '战斗结束')}
            </h2>
          </div>
          {data.phase === 'deploy' ? (
            <button className="action" onClick={() => onClose()}>关闭</button>
          ) : null}
        </div>

        <div className="flex items-start justify-center gap-40">
          <BattleGrid
            side={data.enemySide}
            label="攻击方"
            isPlayer={false}
            facing="attacker"
            highlightAtk={enemyAtk}
            highlightDef={enemyDef}
            visualHp={data.phase === 'fighting' ? visualEnemyHp : undefined}
          />
          <BattleGrid
            side={data.playerSide}
            label="防守方"
            isPlayer={true}
            facing="defender"
            highlightAtk={playerAtk}
            highlightDef={playerDef}
            visualHp={data.phase === 'fighting' ? visualPlayerHp : undefined}
            onCellClick={handleCellClick}
            showEmptyHint={data.phase === 'deploy' && selectedCombatantId !== null}
          />
        </div>

        {data.phase === 'deploy' ? (
          <div className="mt-3 flex items-stretch gap-2 overflow-x-auto pb-1">
            {data.playerRoster.map((unit) => {
              const cell = data.playerSide.cells.find((c) => c.combatantId === unit.id)
              const deployed = Boolean(cell)
              const selected = selectedCombatantId === unit.id
              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => handleRosterClick(unit.id)}
                  className={[
                    'flex w-40 shrink-0 flex-col gap-1 rounded-[12px] border p-2 text-left transition',
                    deployed
                      ? 'border-emerald-400/50 bg-emerald-400/5'
                      : selected
                        ? 'border-amber-300/70 bg-amber-300/10'
                        : 'border-[#7a5a36]/40 bg-[#2a1e14]/60 hover:border-[#c19154]/50',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-medium text-[#fff4dd]">{unit.name}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] ${SKILL_COLOR[unit.skill]}`}>
                      {COMBAT_SKILL_LABELS[unit.skill]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#cdb48a]">
                    <span className="shrink-0">耐久</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1a110a]/70">
                      <div
                        className={`h-full rounded-full ${hpBarColor(unit.hp, unit.maxHp)}`}
                        style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0">{unit.hp}/{unit.maxHp}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <span className="text-amber-200/90">剑{unit.stats.swordAtk}</span>
                    <span className="text-violet-200/90">法{unit.stats.spellAtk}</span>
                    <span className="text-red-200/90">近{unit.stats.meleeAtk}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-[#8fbf8f]">
                    <span>剑{unit.stats.swordDef}</span>
                    <span>法{unit.stats.spellDef}</span>
                    <span>近{unit.stats.meleeDef}</span>
                  </div>
                  <p className="text-[10px] leading-tight">
                    {deployed && cell ? (
                      <span className="text-emerald-300">{getCellLabel(data.playerSide.cells.indexOf(cell))} · 已部署</span>
                    ) : selected ? (
                      <span className="text-amber-300">待部署 · 点击阵位</span>
                    ) : (
                      <span className="text-[#6f5539]">点击选中部署</span>
                    )}
                  </p>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-[#ead8ba]">
            {data.phase === 'deploy' ? (
              <>
                <span>
                  已部署: <strong className="text-[#fff4dd]">{deployedCount}</strong> / {Math.min(8, data.playerRoster.length)} 人
                </span>
                <span className="text-[#7a5a36]">|</span>
                <span className="text-xs text-amber-100/40">
                  {selectedCombatant
                    ? `选中「${selectedCombatant.name}」，点击右侧阵位部署`
                    : '点击修士卡片选中，再点击阵位部署；已部署格点击可撤下'}
                </span>
              </>
            ) : data.phase === 'fighting' ? (
              <span>回合: <strong className="text-[#fff4dd]">{data.roundIndex}</strong></span>
            ) : (
              <span>日志: <strong className="text-[#fff4dd]">{data.logs.length}</strong> 条行动</span>
            )}
          </div>
          <div className="flex gap-2">
            {data.phase === 'deploy' ? (
              <>
                <button className="action" onClick={() => {
                  if (deployedCount === 0) {
                    setConfirmZeroDeploy('normal')
                  } else {
                    startFight()
                  }
                }}>
                  开始战斗
                </button>
                <button className="action" onClick={() => {
                  if (deployedCount === 0) setConfirmZeroDeploy('quick')
                  else startFight(true)
                }}>
                  快速战斗
                </button>
                <button className="action" onClick={handleAutoDeploy}>自动部署</button>
              </>
            ) : null}
            {data.phase === 'fighting' ? (
              <button className="action" onClick={() => {
                clearTimeout(pauseTimerRef.current)
                const f = animFinalRef.current
                if (f) {
                  setData(prev => {
                    prev.playerSide = f.playerSide
                    prev.enemySide = f.enemySide
                    prev.phase = 'result'
                    prev.logs.push(...animLogsRef.current)
                    prev.roundIndex = f.roundCount
                    return { ...prev }
                  })
                }
                setAnimIndex(-1)
                setAttackHighlight(null)
                setVisualPlayerHp([])
                setVisualEnemyHp([])
              }}>
                跳过战斗
              </button>
            ) : null}
            {data.phase === 'result' ? (
              <button className="action" onClick={settle}>结算完成</button>
            ) : null}
          </div>
        </div>

        {data.phase === 'result' ? (
          <div className="mt-3 flex-1 overflow-hidden rounded-[16px] border border-[#7a5a36]/40 bg-[#2a1e14]/60 p-5 text-sm text-[#ead8ba]">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-100/40">战果统计</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">飞舟耐久损失</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">
                  {Math.max(0, data.shipInitialDurability - data.playerSide.cells[4].currentHp)} / {data.shipInitialDurability}
                </p>
              </div>
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">战斗人员阵亡</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">{fallenCount} / {data.playerDeployedCount}</p>
              </div>
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">战斗结论</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">
                  {isShipDestroyed(data.playerSide) ? '失败' : '胜利'}
                </p>
              </div>
            </div>
            <div className="mt-3 max-h-[120px] overflow-y-auto rounded-[12px] border border-[#7a5a36]/25 bg-[#1a110a]/60 p-3 text-xs leading-6">
              {data.logs.length === 0 ? (
                <p className="text-amber-100/30">无战斗记录</p>
              ) : (
                data.logs.map((log, i) => (
                  <p key={i} className={log.side === 'player' ? 'text-emerald-300/80' : 'text-red-300/80'}>
                    [{log.side === 'player' ? '己方' : '敌方'}] {log.fromName ?? getCellLabel(log.fromPos)} → {log.toName ?? getCellLabel(log.toPos)}，
                    {log.breakdown ? `剑${log.breakdown.sword} 法${log.breakdown.spell} 近${log.breakdown.melee}，` : ''}
                    共 {log.damage} 伤害{log.killed ? ' 💀' : ''}
                  </p>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      {confirmZeroDeploy ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1d140d]/60 backdrop-blur-sm rounded-[22px]">
          <div className="mx-6 rounded-[18px] border border-[#b8863a]/70 bg-[linear-gradient(180deg,rgba(80,50,20,0.98),rgba(40,25,12,0.97))] p-6 text-center shadow-[0_20px_60px_rgba(20,10,4,0.8)]">
            <p className="text-sm text-amber-100/60">警告</p>
            <p className="mt-3 text-base leading-7 text-[#ead8ba]">
              不部署战斗人员会导致飞舟单独作战，<br />
              可能承受全部火力。
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button className="action" onClick={() => { setConfirmZeroDeploy(false); startFight(confirmZeroDeploy === 'quick', true) }}>
                {confirmZeroDeploy === 'quick' ? '快速开始' : '确认战斗'}
              </button>
              <button className="action" onClick={() => setConfirmZeroDeploy(false)}>
                取消部署
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
