import { categoryLabelMap, nodeTypeLabelMap, productMap, realmLabelMap } from '@/game/data'
import { getAdjacentNodes, getBranchIncome, getBranchProductPool, getCurrentNode, getProductPrice, getSelectedNode, getTradableProducts } from '@/game/engine'
import type { BuildingType, GameSession } from '@/game/types'

const buildingOptions: { type: BuildingType; label: string }[] = [
  { type: 'hub', label: '集散行' },
  { type: 'alchemy', label: '丹房' },
  { type: 'forge', label: '器坊' },
  { type: 'sigil', label: '符坊' },
  { type: 'auction', label: '拍卖行' },
]

interface NodeSidebarProps {
  session: GameSession
  onTavernRumor: () => void
  onMoveOrExplore: (nodeId: string) => void
  onBuyProduct: (productId: string) => void
  onSellCargo: (cargoId: string) => void
  onEstablishBranch: () => void
  onBuildBuilding: (nodeId: string, type: BuildingType) => void
}

export default function NodeSidebar(props: NodeSidebarProps) {
  const { session, onTavernRumor, onMoveOrExplore, onBuyProduct, onSellCargo, onEstablishBranch, onBuildBuilding } = props
  const currentNode = getCurrentNode(session)
  const selectedNode = getSelectedNode(session)
  const branchPool = selectedNode.branchId ? getBranchProductPool(session, selectedNode.id) : []

  return (
    <div className="space-y-4">
      <Panel title="据点详情" subtitle={selectedNode.name}>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
          <Detail label="类型" value={nodeTypeLabelMap[selectedNode.type]} />
          <Detail label="状态" value={selectedNode.discovery === 'confirmed' ? '确认' : '传闻'} />
          {selectedNode.type === 'town' ? <Detail label="繁荣度" value={selectedNode.prosperity ?? 0} /> : null}
        </div>
      </Panel>

      <Panel title="移动与探索" subtitle="每回合仅 1 次耗时动作">
        <div className="space-y-2">
          {getAdjacentNodes(session, currentNode.id)
            .filter((item) => item.node.discovery !== 'hidden' || item.edge.discovery !== 'hidden')
            .map(({ edge, node }) => (
              <button
                key={edge.id}
                type="button"
                onClick={() => onMoveOrExplore(node.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left text-sm text-slate-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
              >
                <span>{node.name}</span>
                <span className="text-xs text-slate-300">{node.discovery === 'confirmed' ? '移动' : '探索并前往'}</span>
              </button>
            ))}
        </div>
      </Panel>

      <Panel title="商品市场" subtitle={selectedNode.id === currentNode.id ? '当前据点原产商品' : '仅当前驻留据点可交易'}>
        {selectedNode.id === currentNode.id ? (
          <div className="space-y-2">
            {getTradableProducts(session, currentNode).map((productId) => {
              const product = productMap[productId]
              const price = getProductPrice(session, currentNode, productId, 'buy')
              const entry = currentNode.inventory[productId]
              return (
                <div key={productId} className="rounded-2xl border border-white/8 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {realmLabelMap[product.realm]} · {categoryLabelMap[product.category]} · 库存 {entry?.quantity ?? 1}/{entry?.max ?? 1}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onBuyProduct(productId)}
                      className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100 transition hover:bg-amber-300/20"
                    >
                      购入 {price}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">你必须驻留在目标据点，才能买卖当地原产商品。</p>
        )}
      </Panel>

      <Panel title="货仓出售" subtitle={`已载货 ${session.player.cargo.length}/${session.player.cargoCapacity}`}>
        <div className="space-y-2">
          {session.player.cargo.length ? (
            session.player.cargo.map((cargo) => {
              const sellPrice = getProductPrice(session, currentNode, cargo.productId, 'sell') ?? 0
              const profit = sellPrice - cargo.cost
              return (
                <button
                  key={cargo.id}
                  type="button"
                  onClick={() => onSellCargo(cargo.id)}
                  className="flex w-full items-start justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-100 hover:bg-emerald-300/10"
                >
                  <div>
                    <div>{productMap[cargo.productId].name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      成本 {cargo.cost} · 现售 {sellPrice} · 本仓{profit >= 0 ? `盈利 +${profit}` : `亏损 ${profit}`}
                    </div>
                  </div>
                  <span>售出</span>
                </button>
              )
            })
          ) : (
            <p className="text-sm text-slate-400">货仓为空，跑商收入会显示在这里。</p>
          )}
        </div>
      </Panel>

      <Panel title="酒馆与商号" subtitle={selectedNode.name}>
        <div className="space-y-3">
          {selectedNode.id === currentNode.id && currentNode.type === 'town' ? (
            <button
              type="button"
              onClick={onTavernRumor}
              className="w-full rounded-2xl border border-fuchsia-300/30 bg-fuchsia-300/10 px-4 py-3 text-sm text-fuchsia-100 hover:bg-fuchsia-300/20"
            >
              请客打听 {session.config.exploration.tavernRumorCost} 灵石
            </button>
          ) : null}
          {selectedNode.id === currentNode.id && currentNode.type === 'town' && !selectedNode.branchId ? (
            <button
              type="button"
              onClick={onEstablishBranch}
              className="w-full rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100 hover:bg-emerald-300/20"
            >
              在此设立商号
            </button>
          ) : null}
          {selectedNode.branchId ? (
            <>
              <div className="rounded-2xl border border-white/8 bg-slate-900/50 px-4 py-3 text-sm text-slate-200">
                产品池 {branchPool.length} 种，预计每回合收益 {getBranchIncome(session, selectedNode.id)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {buildingOptions.map((building) => (
                  <button
                    key={building.type}
                    type="button"
                    onClick={() => onBuildBuilding(selectedNode.id, building.type)}
                    className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-slate-100 hover:bg-cyan-300/10"
                  >
                    {building.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[26px] border border-white/8 bg-slate-950/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.35)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
        <h3 className="mt-2 font-serif text-lg text-white">{subtitle}</h3>
      </div>
      {children}
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-base text-white">{value}</p>
    </div>
  )
}
