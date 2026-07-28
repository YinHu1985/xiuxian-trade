import { useState } from 'react'
import { getCurrentNode, getTradableProducts, getProductPrice } from '@/game/engine'
import { productMap, categoryLabelMap, realmLabelMap } from '@/game/data'
import type { GameSession } from '@/game/types'

export function MarketWindow({
  session,
  nodeId,
  onBuyProduct,
  onSellCargo,
}: {
  session: GameSession
  nodeId: string
  onBuyProduct: (productId: string) => void
  onSellCargo: (cargoId: string) => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const isLocal = targetNode.id === currentNode.id
  const tradableProducts = getTradableProducts(session, targetNode)

  const [pendingBuys, setPendingBuys] = useState<{ productId: string; price: number }[]>([])
  const [pendingSells, setPendingSells] = useState<{ cargoId: string; productName: string; sellPrice: number; cost: number }[]>([])

  const cargoLength = session.player.cargo.length
  const cargoCapacity = session.player.cargoCapacity
  const slotsAfterPlan = cargoLength - pendingSells.length + pendingBuys.length
  const canAddBuy = slotsAfterPlan < cargoCapacity

  const toggleBuy = (productId: string) => {
    setPendingBuys((prev) => {
      const idx = prev.findIndex((p) => p.productId === productId)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      const slotsAfterAdd = cargoLength - pendingSells.length + prev.length
      if (slotsAfterAdd >= cargoCapacity) return prev
      const price = getProductPrice(session, targetNode, productId, 'buy') ?? 0
      return [...prev, { productId, price }]
    })
  }

  const toggleSell = (cargoId: string, productId: string, cost: number) => {
    setPendingSells((prev) => {
      const idx = prev.findIndex((p) => p.cargoId === cargoId)
      if (idx >= 0) return prev.filter((_, i) => i !== idx)
      const sellPrice = getProductPrice(session, currentNode, productId, 'sell') ?? 0
      return [...prev, { cargoId, productName: productMap[productId].name, sellPrice, cost }]
    })
  }

  const totalCost = pendingBuys.reduce((sum, p) => sum + p.price, 0)
  const totalIncome = pendingSells.reduce((sum, p) => sum + p.sellPrice, 0)
  const totalSellCost = pendingSells.reduce((sum, p) => sum + p.cost, 0)
  const totalSellProfit = totalIncome - totalSellCost
  const netChange = totalIncome - totalCost

  const handleConfirm = () => {
    pendingBuys.forEach((p) => onBuyProduct(p.productId))
    pendingSells.forEach((p) => onSellCargo(p.cargoId))
    setPendingBuys([])
    setPendingSells([])
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="overflow-y-auto rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">交易所</p>
          <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">本地特产</h3>
          <div className="mt-4 grid gap-3">
            {tradableProducts.map((productId) => {
              const product = productMap[productId]
              const entry = targetNode.inventory[productId]
              const price = getProductPrice(session, targetNode, productId, 'buy') ?? 0
              const isPending = pendingBuys.some((p) => p.productId === productId)
              return (
                <div key={productId} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-[#fff4dd]">{product.name}</p>
                      <p className="mt-1 text-xs text-[#cdb48a]">
                        {realmLabelMap[product.realm]} · {categoryLabelMap[product.category]} · 库存 {entry?.quantity ?? 1}/{entry?.max ?? 1}
                      </p>
                    </div>
                    <button
                      className={`!px-3 !py-2 text-xs ${isPending ? 'cursor-default rounded-full border border-[#c19154]/40 bg-[rgba(247,224,186,0.06)] px-3 py-1 text-[#cdb48a]' : 'action'}`}
                      data-sfx="trade"
                      onClick={() => isLocal && !isPending && toggleBuy(productId)}
                      disabled={!isLocal || (!isPending && !canAddBuy)}
                    >
                      {!isLocal ? `查阅 ${price}` : isPending ? '已计划' : canAddBuy ? `购入 ${price}` : '货仓满'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="overflow-y-auto rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isLocal ? '货仓' : '查档说明'}</p>
          <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{isLocal ? '已载大宗货物' : '异地交易档案'}</h3>
          <div className="mt-4 grid gap-3">
            {isLocal ? (
              <>
                {session.player.cargo.map((cargo) => {
                  const product = productMap[cargo.productId]
                  const sellPrice = getProductPrice(session, currentNode, cargo.productId, 'sell') ?? 0
                  const profit = sellPrice - cargo.cost
                  const isPending = pendingSells.some((p) => p.cargoId === cargo.id)
                  return (
                    <div
                      key={cargo.id}
                      className={`flex items-start justify-between rounded-[14px] border px-4 py-3 text-sm text-[#fff4dd] ${isPending ? 'border-[#c19154]/70 bg-[linear-gradient(180deg,rgba(110,78,43,0.96),rgba(68,48,28,0.94))]' : 'border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(91,60,35,0.94),rgba(58,38,24,0.92))]'}`}
                    >
                      <div>
                        <div>{product.name}</div>
                        <div className="mt-1 text-xs text-[#cdb48a]">
                          成本 {cargo.cost} · 现售 {sellPrice} · 本仓{profit >= 0 ? `盈利 +${profit}` : `亏损 ${profit}`}
                        </div>
                      </div>
                      <button
                        className={`rounded-full border px-3 py-1 text-xs text-[#fff4dd] ${isPending ? 'border-[#c19154]/70 bg-[rgba(247,224,186,0.15)]' : 'border-[#c19154]/50 bg-[rgba(247,224,186,0.08)]'}`}
                        data-sfx="trade"
                        onClick={() => toggleSell(cargo.id, cargo.productId, cargo.cost)}
                      >
                        {isPending ? '取消售出' : '售出'}
                      </button>
                    </div>
                  )
                })}
                {pendingBuys.length > 0 && (
                  <>
                    {session.player.cargo.length > 0 && (
                      <div className="border-t border-[#7a5a36]/30 pt-2" />
                    )}
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-100/30">计划购入</p>
                    {pendingBuys.map((pb) => {
                      const product = productMap[pb.productId]
                      return (
                        <div
                          key={pb.productId}
                          className="flex items-start justify-between rounded-[14px] border border-[#7b8c40]/45 bg-[linear-gradient(180deg,rgba(70,82,35,0.92),rgba(48,58,24,0.9))] px-4 py-3 text-sm text-[#fff4dd]"
                        >
                          <div>
                            <div>{product.name}</div>
                            <div className="mt-1 text-xs text-[#cdb48a]">计划购入 · {pb.price} 灵石</div>
                          </div>
                          <button
                            className="rounded-full border border-[#c19154]/50 bg-[rgba(247,224,186,0.08)] px-3 py-1 text-xs text-[#fff4dd]"
                            data-sfx="trade"
                            onClick={() => toggleBuy(pb.productId)}
                          >
                            取消买入
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
                {session.player.cargo.length === 0 && pendingBuys.length === 0 && (
                  <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">当前货仓为空。</div>
                )}
              </>
            ) : (
              <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm leading-6 text-[#cdb48a]">
                当前只是从其他主界面翻阅 {targetNode.name} 的货品账档，还不能直接在异地完成买卖。
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between rounded-[16px] border border-[#7a5a36]/50 bg-[linear-gradient(180deg,rgba(60,40,22,0.96),rgba(38,25,16,0.94))] px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <span>货仓：<span className="text-amber-200/80">{cargoLength}/{cargoCapacity}</span></span>
          <span className={slotsAfterPlan > cargoCapacity ? 'text-red-300/90' : 'text-amber-200/60'}>
            → {slotsAfterPlan}/{cargoCapacity}
          </span>
          <span>买入：<span className="text-amber-200/80">{totalCost}</span></span>
          <span>卖出：<span className="text-amber-200/80">{totalIncome}</span><span className={`ml-1 text-xs ${totalSellProfit >= 0 ? 'text-emerald-300/70' : 'text-red-300/70'}`}>（{totalSellProfit >= 0 ? `利润 +${totalSellProfit}` : `亏损 ${totalSellProfit}`}）</span></span>
          <span className={netChange >= 0 ? 'text-emerald-300/90' : 'text-red-300/90'}>
            净变化：{netChange >= 0 ? `+${netChange}` : netChange}
          </span>
        </div>
        <div className="flex gap-3">
          <button className="rounded-full border border-[#7a5a36]/50 px-5 py-1.5 text-xs text-[#cdb48a] transition hover:border-[#c19154]/60 hover:text-[#fff4dd]" onClick={() => { setPendingBuys([]); setPendingSells([]) }}>
            清空
          </button>
          <button
            className="action"
            data-sfx="confirm"
            disabled={pendingBuys.length === 0 && pendingSells.length === 0}
            onClick={handleConfirm}
          >
            确认交易
          </button>
        </div>
      </div>
    </div>
  )
}
