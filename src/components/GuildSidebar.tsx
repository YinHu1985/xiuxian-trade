import { getBranchIncome, getBranchProductPool } from '@/game/engine'
import type { GameSession } from '@/game/types'

interface GuildSidebarProps {
  session: GameSession
  onCreateTradeLink: (nodeId: string) => void
  onDispatchRetainer: (nodeId: string) => void
  onRepairGate: () => void
}

export default function GuildSidebar({ session, onCreateTradeLink, onDispatchRetainer, onRepairGate }: GuildSidebarProps) {
  const currentNode = session.world.nodes.find((node) => node.id === session.player.currentNodeId)!
  const candidateLinks = session.guild.branches
    .filter((branch) => branch.nodeId !== currentNode.id)
    .map((branch) => session.world.nodes.find((node) => node.id === branch.nodeId)!)
  const rumorTargets = session.world.nodes.filter((node) => node.discovery === 'rumor')

  return (
    <div className="space-y-4">
      <Panel title="商号总览">
        <div className="space-y-3">
          {session.guild.branches.length ? (
            session.guild.branches.map((branch) => {
              const node = session.world.nodes.find((item) => item.id === branch.nodeId)!
              return (
                <div key={branch.id} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">{node.name}</p>
                      <p className="mt-1 text-xs text-slate-400">产品池 {getBranchProductPool(session, node.id).length} 种</p>
                    </div>
                    <span className="text-sm text-emerald-200">+{getBranchIncome(session, node.id)}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <Empty text="还没有建立商号，先在确认的城镇落脚。" />
          )}
        </div>
      </Panel>

      <Panel title="贸易连接">
        <div className="space-y-2">
          {candidateLinks.length ? (
            candidateLinks.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onCreateTradeLink(node.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 hover:bg-cyan-300/10"
              >
                <span>连接 {node.name}</span>
                <span className="text-xs text-slate-400">维护 {session.config.economy.tradeLinkMaintenance}</span>
              </button>
            ))
          ) : (
            <Empty text="需要当前据点和目标据点都设有商号后，才能建立贸易连接。" />
          )}
          <div className="rounded-2xl border border-white/8 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
            已建立 {session.guild.tradeLinks.length}/{session.player.tradeLinkCapacity} 条贸易连接
          </div>
        </div>
      </Panel>

      <Panel title="供奉调度">
        <div className="space-y-2">
          {rumorTargets.length ? (
            rumorTargets.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onDispatchRetainer(node.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 hover:bg-violet-300/10"
              >
                <span>确认 {node.name}</span>
                <span className="text-xs text-slate-400">
                  空闲 {session.guild.retainers.filter((retainer) => retainer.status === 'idle').length}
                </span>
              </button>
            ))
          ) : (
            <Empty text="暂无可由供奉代办的传闻据点。" />
          )}
          <div className="rounded-2xl border border-white/8 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
            {session.guild.retainers.map((retainer) => `${retainer.name}:${retainer.status === 'idle' ? '空闲' : '忙碌'}`).join(' / ')}
          </div>
        </div>
      </Panel>

      <Panel title="终局工程">
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-4 text-sm text-amber-50">
          <p>当商号数量达到 {session.config.progress.finalObjectiveProsperityThreshold} 且灵石充足时，可修复灾前传送阵。</p>
          <button
            type="button"
            onClick={onRepairGate}
            className="mt-4 w-full rounded-2xl border border-amber-300/30 bg-slate-950/40 px-4 py-3 hover:bg-amber-300/20"
          >
            {session.world.finalObjectiveCompleted ? '已完成终局探索' : '投入 1200 灵石修复传送阵'}
          </button>
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] border border-white/8 bg-slate-950/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-slate-400">{text}</p>
}
