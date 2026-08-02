import { useState, type JSX } from 'react'
import { airshipBackgroundUrl } from '@/game/backgrounds'
import { COMBAT_SKILL_DESCRIPTIONS, COMBAT_SKILL_LABELS, SHIP_STATS } from '@/game/battle'
import { getRepairCombatantCost } from '@/game/engine'
import { OverlayFrame, FloatingPanel, StatChip } from '@/components/ui'
import type { CombatSkill, GameSession } from '@/game/types'

type CabinTab = 'items' | 'quests' | 'logs'

const SKILL_CHIP: Record<CombatSkill, string> = {
  sword: 'text-amber-300 border-amber-300/40 bg-amber-300/5',
  formation: 'text-sky-300 border-sky-300/40 bg-sky-300/5',
  spirit: 'text-violet-300 border-violet-300/40 bg-violet-300/5',
  ship: 'text-emerald-300 border-emerald-300/40 bg-emerald-300/5',
  body: 'text-red-300 border-red-300/40 bg-red-300/5',
}

function hpBarColorClass(hp: number, maxHp: number): string {
  const ratio = hp / maxHp
  if (ratio > 0.6) return 'bg-emerald-500'
  if (ratio > 0.3) return 'bg-amber-500'
  return 'bg-red-500'
}

/** 随行修士：查看能力 + 花钱修整（回复耐久） */
function CombatantRosterWindow({
  session,
  onRepairCombatant,
  onClose,
}: {
  session: GameSession
  onRepairCombatant: (combatantId: string) => void
  onClose: () => void
}) {
  const shipStats: Array<[string, number, string]> = [
    ['飞剑攻', SHIP_STATS.swordAtk, 'text-amber-200'],
    ['飞剑防', SHIP_STATS.swordDef, 'text-sky-200'],
    ['法术攻', SHIP_STATS.spellAtk, 'text-violet-200'],
    ['法术防', SHIP_STATS.spellDef, 'text-emerald-200'],
    ['近身攻', SHIP_STATS.meleeAtk, 'text-red-200'],
    ['近身防', SHIP_STATS.meleeDef, 'text-orange-200'],
  ]

  return (
    <OverlayFrame title="随行修士" onClose={onClose}>
      <div className="flex h-full flex-col gap-4">
        <div className="rounded-[16px] border border-[#7a5a36]/50 bg-[linear-gradient(180deg,rgba(67,45,28,0.9),rgba(41,28,19,0.88))] p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">主飞舟攻防</p>
          <div className="mt-3 grid grid-cols-6 gap-2 text-center">
            {shipStats.map(([label, value, color]) => (
              <div key={label} className="rounded-[10px] border border-[#7a5a36]/30 bg-[#1a110a]/50 px-2 py-2">
                <p className="text-[10px] text-[#cdb48a]">{label}</p>
                <p className={`mt-1 text-base font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#7a5a36]">飞舟耐久即其生命值，战斗中固定位于中央格。</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-3">
            {session.player.combatants.map((unit) => {
              const cost = getRepairCombatantCost(session, unit.id)
              const needRepair = unit.hp < unit.maxHp
              return (
                <div
                  key={unit.id}
                  className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-[#fff4dd]">{unit.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${SKILL_CHIP[unit.skill]}`}>
                        {COMBAT_SKILL_LABELS[unit.skill]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28">
                        <p className="text-right text-xs text-[#cdb48a]">耐久 {unit.hp}/{unit.maxHp}</p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1a110a]/70">
                          <div
                            className={`h-full rounded-full ${hpBarColorClass(unit.hp, unit.maxHp)}`}
                            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                      <button
                        className="action disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!needRepair || session.player.spiritStone < cost}
                        onClick={() => onRepairCombatant(unit.id)}
                      >
                        {needRepair ? `修整（${cost} 灵石）` : '耐久已满'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[#cdb48a]">{COMBAT_SKILL_DESCRIPTIONS[unit.skill]}</p>
                  <div className="mt-2 grid grid-cols-6 gap-2 text-center text-[11px]">
                    <span className="text-amber-200">剑攻 {unit.stats.swordAtk}</span>
                    <span className="text-sky-200">剑防 {unit.stats.swordDef}</span>
                    <span className="text-violet-200">法攻 {unit.stats.spellAtk}</span>
                    <span className="text-emerald-200">法防 {unit.stats.spellDef}</span>
                    <span className="text-red-200">近攻 {unit.stats.meleeAtk}</span>
                    <span className="text-orange-200">近防 {unit.stats.meleeDef}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </OverlayFrame>
  )
}

function CaptainCabin({ session, onClose }: { session: GameSession; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<CabinTab>('items')

  const tabs: Array<{ key: CabinTab; label: string; count?: number }> = [
    { key: 'items', label: '行囊' },
    { key: 'quests', label: '任务', count: session.guild.quests.filter((q) => q.status === 'active').length },
    { key: 'logs', label: '日志', count: session.world.logs.length },
  ]

  const tabContent: Record<CabinTab, JSX.Element> = {
    items: (
      <div className="grid gap-3">
        {session.player.items.length > 0 ? (
          session.player.items.map((item) => {
            const isLetter = item.name === '信函'
            return (
              <div
                key={item.id}
                className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#fff4dd]">
                    {item.name}
                    {item.count > 1 ? <span className="ml-2 text-xs text-[#cdb48a]">x{item.count}</span> : null}
                  </p>
                  {isLetter ? <span className="rounded-full border border-[#b88b54]/35 bg-[rgba(247,224,186,0.08)] px-3 py-0.5 text-xs text-[#f1dfbf]">函</span> : null}
                </div>
                {isLetter && item.data ? (
                  <p className="mt-1 text-xs text-[#cdb48a]">
                    送往：{item.data.targetNodeName ?? '未知'}
                  </p>
                ) : null}
              </div>
            )
          })
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
            行囊空空。
          </div>
        )}
      </div>
    ),

    quests: (() => {
      const activeQuests = session.guild.quests.filter((q) => q.status === 'active')
      if (activeQuests.length === 0) {
        return (
          <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
            当前没有进行中的委托。
          </div>
        )
      }
      return (
        <div className="grid gap-3">
          {activeQuests.map((quest) => {
            const targetNode = quest.targetNodeId
              ? session.world.nodes.find((n) => n.id === quest.targetNodeId)
              : undefined
            return (
              <div
                key={quest.id}
                className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3"
              >
                <p className="text-sm text-[#fff4dd]">{quest.title}</p>
                <p className="mt-1 text-xs text-[#cdb48a]">
                  委托人：{quest.npcName}
                  {quest.type === 'deliver' && targetNode
                    ? ` · 送往：${targetNode.name}`
                    : quest.type === 'deliver'
                      ? ' · 送信途中'
                      : null}
                  {quest.type === 'purchase' ? ` · 报酬：${quest.reward} 灵石` : null}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#b88b54]/35 bg-[rgba(247,224,186,0.08)] px-2 py-0.5 text-xs text-[#f1dfbf]">
                    {quest.type === 'purchase' ? '收购' : quest.type === 'deliver' ? '送信' : '交易'}
                  </span>
                  <span className="rounded-full border border-[#7b9b54]/35 bg-[rgba(186,247,155,0.08)] px-2 py-0.5 text-xs text-[#dff1bf]">
                    进行中
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )
    })(),

    logs: (
      <div className="flex flex-col">
        {session.world.logs.length > 0 ? (
          session.world.logs.map((log, index) => (
            <div
              key={`${log}-${index}`}
              className="border-t border-t-[#7b5b39]/20 px-4 py-1.5 text-xs text-[#ead8ba] first:border-t-0"
            >
              {log}
            </div>
          ))
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
            尚无日志记录。
          </div>
        )}
      </div>
    ),
  }

  return (
    <OverlayFrame title="船长室" onClose={onClose}>
      <div className="flex h-full flex-col">
        {/* Tab bar */}
        <div className="flex shrink-0 gap-0 border-b border-b-[#7b5b39]/42">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                className={`relative px-5 py-3 text-sm transition-colors ${
                  active
                    ? 'text-[#f0c080] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#f0c080]'
                    : 'text-[#cdb48a]/60 hover:text-[#cdb48a]'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span className="ml-2 rounded-full bg-[#7b5b39]/50 px-2 py-0.5 text-xs text-[#cdb48a]">
                    {tab.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="mt-4 flex-1 overflow-y-auto">
          {tabContent[activeTab]}
        </div>
      </div>
    </OverlayFrame>
  )
}

export function AirshipStage({
  session,
  onIncreaseRetainerCapacity,
  onIncreaseCargoCapacity,
  onIncreaseMoveRange,
  onRepairAirship,
  onRepairCombatant,
  onStartDrill,
}: {
  session: GameSession
  onIncreaseRetainerCapacity: () => void
  onIncreaseCargoCapacity: () => void
  onIncreaseMoveRange: () => void
  onRepairAirship: () => void
  onRepairCombatant: (combatantId: string) => void
  onStartDrill: () => void
}) {
  const retainerCost = session.config.economy.retainerUpgradeBaseCost * (session.player.retainerCapacity - 1)
  const cargoCost = session.config.economy.cargoUpgradeBaseCost * (session.player.cargoCapacity - 1)
  const moveRangeCost = session.config.economy.moveRangeUpgradeBaseCost * session.player.moveRange
  const repairCost = session.config.economy.repairAirshipCost
  const cargoMaxed = session.player.cargoCapacity >= 5
  const moveRangeMaxed = session.player.moveRange >= 10
  const moveRangeBlocked = session.player.moveRange === 3 && !session.world.lastMoveRangeUpgradeUnlocked

  const [showModifications, setShowModifications] = useState(false)
  const [showCaptainCabin, setShowCaptainCabin] = useState(false)
  const [showCombatantRoster, setShowCombatantRoster] = useState(false)

  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,rgba(66,56,34,0.38),rgba(20,14,11,0.96)_76%)]">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-68" style={{ backgroundImage: `url("${airshipBackgroundUrl}")` }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(236,255,216,0.16),transparent_18%),linear-gradient(180deg,rgba(15,17,19,0.08),rgba(12,10,8,0.72)_78%)]" />

      <div className="pointer-events-none absolute inset-x-[18%] top-[15%] text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/45">飞舟 / 商会总部</p>
        <h2 className="mt-4 font-serif text-5xl text-[#eef6dd]">云海飞舟</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#d7d7bf]">
          飞舟总部——编制概览与舱室入口均收至两侧面板。
        </p>
      </div>

      <div className="absolute left-5 top-5 flex w-72 flex-col gap-4" style={{ maxHeight: 'calc(100% - 40px)' }}>
        <FloatingPanel title="飞舟改造" subtitle="舱室设备">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-3 py-2 text-center">
              <p className="text-xs text-[#cdb48a]">耐久度</p>
              <p className="text-sm text-[#fff4dd]">{session.player.airshipDurability}/{session.player.airshipMaxDurability}</p>
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-3 py-2 text-center">
              <p className="text-xs text-[#cdb48a]">船员</p>
              <p className="text-sm text-[#fff4dd]">{session.player.airshipCrew}/{session.player.airshipMaxCrew}</p>
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-3 py-2 text-center">
              <p className="text-xs text-[#cdb48a]">货仓</p>
              <p className="text-sm text-[#fff4dd]">{session.player.cargoCapacity}/5</p>
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-3 py-2 text-center">
              <p className="text-xs text-[#cdb48a]">聚灵阵</p>
              <p className="text-sm text-[#fff4dd]">{session.player.retainerCapacity} 人</p>
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-3 py-2 text-center">
              <p className="text-xs text-[#cdb48a]">动力</p>
              <p className="text-sm text-[#fff4dd]">{session.player.moveRange}</p>
            </div>
          </div>
          {session.player.airshipDurability < session.player.airshipMaxDurability ? (
            <button
              className="action mt-3 w-full"
              disabled={session.player.spiritStone < repairCost}
              onClick={onRepairAirship}
            >
              修理飞舟（{repairCost} 灵石）
            </button>
          ) : null}
          <button className="action mt-3 w-full" onClick={() => setShowModifications(true)}>
            进入改造舱
          </button>
        </FloatingPanel>

        <FloatingPanel title="船长室" subtitle="行囊与任务">
          <p className="text-sm leading-6 text-[#ead8ba]">
            查看随身物品，追踪当前委托进展。
          </p>
          <button className="action mt-3 w-full" onClick={() => setShowCaptainCabin(true)}>
            进入船长室
          </button>
        </FloatingPanel>

        <FloatingPanel title="随行修士" subtitle="战斗人员">
          <p className="text-sm leading-6 text-[#ead8ba]">
            随行修士 {session.player.combatants.length} 人。查看能力、修整耐久，编入战斗阵型。
          </p>
          <button className="action mt-3 w-full" onClick={() => setShowCombatantRoster(true)}>
            编组管理
          </button>
        </FloatingPanel>

        <FloatingPanel title="演习" subtitle="模拟战">
          <p className="text-sm leading-6 text-[#ead8ba]">
            不消耗资源的模拟战斗，用于测试阵型搭配。
          </p>
          <button className="action mt-3 w-full" onClick={onStartDrill}>
            开始演习
          </button>
        </FloatingPanel>
      </div>

      {showModifications ? (
        <OverlayFrame title="飞舟改造舱" onClose={() => setShowModifications(false)}>
          <div className="grid h-full grid-cols-3 gap-6">
            <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">聚灵阵强化</p>
              <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">供奉编制</h3>
              <p className="mt-2 text-sm leading-7 text-[#ead8ba]">
                当前编制：{session.player.retainerCapacity} 人
              </p>
              <p className="mt-2 text-sm leading-7 text-[#ead8ba]">
                高效的聚灵阵对许多散修而言是梦寐以求的资源。强化聚灵阵可雇佣更多供奉为您办事。
              </p>
              <div className="mt-6">
                <StatChip label="下一级花费" value={retainerCost} />
              </div>
              <button
                className="action mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
                disabled={session.player.spiritStone < retainerCost}
                onClick={onIncreaseRetainerCapacity}
              >
                强化聚灵阵（{retainerCost} 灵石）
              </button>
            </div>

            <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">扩建货仓</p>
              <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">容量 {session.player.cargoCapacity}/5</h3>
              <p className="mt-2 text-sm leading-7 text-[#ead8ba]">
                拓宽飞舟货舱空间，可携带更多货物往来各据点。
              </p>
              {!cargoMaxed ? (
                <div className="mt-6">
                  <StatChip label="扩建花费" value={cargoCost} />
                </div>
              ) : null}
              <button
                className="action mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
                disabled={cargoMaxed || session.player.spiritStone < cargoCost}
                onClick={onIncreaseCargoCapacity}
              >
                {cargoMaxed ? '已满级' : `扩建（${cargoCost} 灵石）`}
              </button>
            </div>

            <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">强化动力</p>
              <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">当前 {session.player.moveRange}</h3>
              <p className="mt-2 text-sm leading-7 text-[#ead8ba]">
                {moveRangeBlocked
                  ? '商会阵法师认为动力法阵还有升级潜力，但目前缺乏一些思路。'
                  : '强化飞舟动力法阵，提升每次出行的移动力。'}
              </p>
              {!moveRangeMaxed && !moveRangeBlocked ? (
                <div className="mt-6">
                  <StatChip label="强化花费" value={moveRangeCost} />
                </div>
              ) : null}
              <button
                className="action mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
                disabled={moveRangeMaxed || moveRangeBlocked || session.player.spiritStone < moveRangeCost}
                onClick={onIncreaseMoveRange}
              >
                {moveRangeMaxed ? '已满级' : moveRangeBlocked ? '暂无思路' : `强化（${moveRangeCost} 灵石）`}
              </button>
            </div>
          </div>
        </OverlayFrame>
      ) : null}

      {showCaptainCabin ? (
        <CaptainCabin session={session} onClose={() => setShowCaptainCabin(false)} />
      ) : null}

      {showCombatantRoster ? (
        <CombatantRosterWindow
          session={session}
          onRepairCombatant={onRepairCombatant}
          onClose={() => setShowCombatantRoster(false)}
        />
      ) : null}
    </div>
  )
}
