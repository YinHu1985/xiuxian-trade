import { useState } from 'react'
import type { GameSession } from '@/game/types'

export function TradeLinkPanel({
  session,
  onCreateTradeLink,
  onRemoveTradeLink,
}: {
  session: GameSession
  onCreateTradeLink: (fromNodeId: string, toNodeId: string) => void
  onRemoveTradeLink: (linkId: string) => void
}) {
  const branchNodes = session.guild.branches
    .map((b) => session.world.nodes.find((n) => n.id === b.nodeId))
    .filter((n): n is NonNullable<typeof n> => n != null && n.discovery !== 'hidden')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const idleRetainers = session.player.retainerCapacity - session.guild.tradeLinks.length - session.guild.retainers.filter((r) => r.status === 'busy').length
  const canCreate = fromId && toId && fromId !== toId && idleRetainers > 0

  const alreadyLinked = (a: string, b: string) =>
    session.guild.tradeLinks.some(
      (link) => [link.fromNodeId, link.toNodeId].includes(a) && [link.fromNodeId, link.toNodeId].includes(b),
    )

  const filteredFrom = branchNodes.filter((n) => n.id !== toId && !alreadyLinked(n.id, toId))
  const filteredTo = branchNodes.filter((n) => n.id !== fromId && !alreadyLinked(fromId, n.id))

  return (
    <div>
      <div className="mt-3 flex flex-col gap-2">
        <select
          className="w-full rounded-[12px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(72,48,30,0.96),rgba(46,31,21,0.94))] px-3 py-2 text-sm text-[#fff4dd] outline-none disabled:cursor-not-allowed disabled:opacity-55"
          value={fromId}
          disabled={!canCreate && fromId === '' && toId === ''}
          onChange={(e) => setFromId(e.target.value)}
        >
          <option value="">选择起点</option>
          {filteredFrom.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <select
          className="w-full rounded-[12px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(72,48,30,0.96),rgba(46,31,21,0.94))] px-3 py-2 text-sm text-[#fff4dd] outline-none disabled:cursor-not-allowed disabled:opacity-55"
          value={toId}
          disabled={!canCreate && fromId === '' && toId === ''}
          onChange={(e) => setToId(e.target.value)}
        >
          <option value="">选择终点</option>
          {filteredTo.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <button
          className="action mt-1 w-full disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canCreate}
          onClick={() => { if (canCreate) { onCreateTradeLink(fromId, toId); setFromId(''); setToId('') } }}
        >
          开辟商路（维护 {session.config.economy.tradeLinkMaintenance}，占用一名供奉）
        </button>
      </div>
      {session.guild.tradeLinks.length > 0 ? (
        <div className="mt-3 overflow-y-auto rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] p-3">
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-100/50">现有商路</p>
          <div className="mt-2 grid gap-1.5">
            {session.guild.tradeLinks.map((link) => {
              const from = session.world.nodes.find((n) => n.id === link.fromNodeId)
              const to = session.world.nodes.find((n) => n.id === link.toNodeId)
              return (
                <div key={link.id} className="rounded-[10px] border border-[#7b5b39]/30 bg-[linear-gradient(180deg,rgba(75,50,30,0.6),rgba(50,33,22,0.55))] px-3 py-2">
                  <div className="text-xs text-[#cdb48a]">
                    {from?.name ?? '?'} ↔ {to?.name ?? '?'}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[10px] text-[#cdb48a]/50">维护 {link.maintenanceCost}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveTradeLink(link.id)}
                      className="rounded-[8px] border border-[#a0563c]/50 bg-[linear-gradient(180deg,rgba(130,60,35,0.85),rgba(95,40,25,0.8))] px-2 py-0.5 text-[10px] text-[#f0ccb0] transition hover:border-[#c9714a]/60 hover:bg-[linear-gradient(180deg,rgba(155,72,42,0.9),rgba(110,48,30,0.85))]"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
