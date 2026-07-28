import { useState } from 'react'
import { airshipBackgroundUrl } from '@/game/backgrounds'
import { OverlayFrame, FloatingPanel, StatChip } from '@/components/ui'
import type { GameSession } from '@/game/types'

export function AirshipStage({
  session,
  onIncreaseRetainerCapacity,
  onIncreaseCargoCapacity,
  onIncreaseMoveRange,
  onRepairAirship,
  onStartDrill,
}: {
  session: GameSession
  onIncreaseRetainerCapacity: () => void
  onIncreaseCargoCapacity: () => void
  onIncreaseMoveRange: () => void
  onRepairAirship: () => void
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
        <OverlayFrame title="船长室 · 行囊与任务" onClose={() => setShowCaptainCabin(false)}>
          <div className="grid h-full grid-cols-2 gap-6">
            <div className="overflow-y-auto rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">随身物品</p>
              <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">行囊</h3>
              {session.player.items.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {session.player.items.map((item) => {
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
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
                  行囊空空。
                </div>
              )}
            </div>

            <div className="overflow-y-auto rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">委托登记簿</p>
              <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">任务追踪</h3>
              {(() => {
                const activeQuests = session.guild.quests.filter((q) => q.status === 'active')
                if (activeQuests.length === 0) {
                  return (
                    <div className="mt-4 rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
                      当前没有进行中的委托。
                    </div>
                  )
                }
                return (
                  <div className="mt-4 grid gap-3">
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
              })()}
            </div>
          </div>
        </OverlayFrame>
      ) : null}
    </div>
  )
}
