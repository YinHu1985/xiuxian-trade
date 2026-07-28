import { getBranchIncome, getTravelOption, getMoveRangeReachableNodeIds, getTradableProducts } from '@/game/engine'
import { nodeTypeLabelMap, productMap } from '@/game/data'
import { mapBackgroundUrl } from '@/game/backgrounds'
import MapPanel from '@/components/MapPanel'
import { FloatingPanel, StatChip } from '@/components/ui'
import { TradeLinkPanel } from '@/components/windows/TradeLinkPanel'
import type { GameSession } from '@/game/types'

export function MapStage({
  session,
  revealAll,
  showMoveRange,
  selectedNode,
  pendingPlan,
  onSelectNode,
  onToggleReveal,
  onToggleMoveRange,
  onScheduleTravel,
  onOpenBranch,
  onCreateTradeLink,
  onRemoveTradeLink,
}: {
  session: GameSession
  revealAll: boolean
  showMoveRange: boolean
  selectedNode: { id: string; name: string; type: string; branchId?: string; discovery: string; prosperity?: number; reputation: number }
  pendingPlan: { type: string; targetNodeId?: string } | null
  onSelectNode: (nodeId: string) => void
  onToggleReveal: () => void
  onToggleMoveRange: () => void
  onScheduleTravel: (nodeId: string) => void
  onOpenBranch: () => void
  onCreateTradeLink: (fromNodeId: string, toNodeId: string) => void
  onRemoveTradeLink: (linkId: string) => void
}) {
  const moveRangeNodeIds = showMoveRange ? getMoveRangeReachableNodeIds(session) : []
  const selectedTravel = getTravelOption(session, selectedNode.id)
  const isSelectedTravelPlanned = pendingPlan?.type === 'travel' && pendingPlan.targetNodeId === selectedNode.id
  const canOpenBranch = Boolean(selectedNode.branchId)
  return (
    <div className="relative h-full overflow-hidden">
      <MapPanel
        session={session}
        onSelectNode={onSelectNode}
        compact
        revealAll={revealAll}
        showFooter={false}
        frameless
        backgroundImageUrl={mapBackgroundUrl}
        highlightedNodeIds={moveRangeNodeIds}
        className="absolute inset-0"
      />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 top-4 z-10 flex justify-between gap-4">
        <div className="flex h-full w-[300px] flex-col">
          <FloatingPanel title="当前选中" subtitle={selectedNode.name}>
            <div className="grid grid-cols-2 gap-3">
              <StatChip label="状态" value={selectedNode.discovery === 'confirmed' ? '确认' : selectedNode.discovery === 'rumor' ? '传闻' : '未知'} />
              <StatChip label="类型" value={nodeTypeLabelMap[selectedNode.type as keyof typeof nodeTypeLabelMap] || selectedNode.type} />
              {selectedNode.type === 'town' ? <StatChip label="繁荣" value={selectedNode.prosperity ?? 0} /> : null}
              <StatChip label="本地声望" value={selectedNode.reputation} />
              <StatChip label="商号收益" value={selectedNode.branchId ? getBranchIncome(session, selectedNode.id) : 0} />
            </div>
            <div className="mt-3 rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.24em] text-amber-100/40">本地特产</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(() => {
                  const node = session.world.nodes.find((n) => n.id === selectedNode.id)
                  if (!node) return <span className="text-xs text-[#cdb48a]/60">暂无</span>
                  const tradableIds = getTradableProducts(session, node)
                  return tradableIds.length > 0
                    ? tradableIds.map((productId) => {
                        const product = productMap[productId]
                        if (!product) return null
                        return (
                          <span
                            key={product.id}
                            className="rounded-full border border-[#b88b54]/35 bg-[rgba(247,224,186,0.08)] px-3 py-1 text-xs text-[#f1dfbf]"
                          >
                            {product.name}
                          </span>
                        )
                      })
                    : <span className="text-xs text-[#cdb48a]/60">暂无</span>
                })()}
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {selectedTravel?.available ? (
                <button
                  className={
                    isSelectedTravelPlanned
                      ? 'w-full rounded-[14px] border border-[#c19154]/70 bg-[linear-gradient(180deg,rgba(128,89,46,0.98),rgba(82,55,30,0.96))] px-4 py-3 text-sm text-[#fff4dd] shadow-[0_10px_24px_rgba(33,20,10,0.28)] transition hover:border-[#d8b073]'
                      : 'w-full rounded-[14px] border border-[#c5975d]/60 bg-[linear-gradient(180deg,rgba(112,74,42,0.98),rgba(76,50,28,0.96))] px-4 py-3 text-sm text-[#fff4dd] shadow-[0_10px_24px_rgba(33,20,10,0.28)] transition hover:border-[#e0b87a] hover:bg-[linear-gradient(180deg,rgba(132,88,48,0.99),rgba(88,58,32,0.97))]'
                  }
                  onClick={() => onScheduleTravel(selectedNode.id)}
                >
                  {isSelectedTravelPlanned
                    ? `已设为本回合目标：${selectedNode.name}`
                    : selectedTravel.kind === 'explore'
                      ? `探索并前往 ${selectedNode.name}`
                      : `前往 ${selectedNode.name}`}
                </button>
              ) : (
                <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-3 text-sm leading-6 text-[#cdb48a]">
                  {selectedTravel?.reason ?? '先在大地图上选中一个可行动的据点。'}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {canOpenBranch ? (
                  <button className="action col-span-2" onClick={onOpenBranch}>
                    打开商会账房
                  </button>
                ) : null}
              </div>
            </div>
          </FloatingPanel>
        </div>

        <div className="flex h-full w-60 flex-col gap-4">
          <FloatingPanel title="商路管理" subtitle={`${session.guild.tradeLinks.length} 条商路`} className="min-h-0 flex-1 flex flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TradeLinkPanel session={session} onCreateTradeLink={onCreateTradeLink} onRemoveTradeLink={onRemoveTradeLink} />
            </div>
          </FloatingPanel>

          <FloatingPanel title="地图操作" subtitle="舆图与路引" className="shrink-0">
            <button className="action mt-1 w-full" onClick={onToggleReveal}>
              {revealAll ? '关闭全图调试' : '显示全图调试'}
            </button>
            <button className="action mt-3 w-full" onClick={onToggleMoveRange}>
              {showMoveRange ? '隐藏移动范围' : '显示移动范围'}
            </button>
            <div className="mt-3 rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm leading-6 text-[#ead8ba]">
              鼠标滚轮缩放，拖动画布平移。地图页只负责拟定计划，真正过回合要回城镇主界面执行。
            </div>
          </FloatingPanel>
        </div>
      </div>
    </div>
  )
}
