import { getCurrentNode, getSectSaleInfo } from '@/game/engine'
import { getItemCount } from '@/game/engine'
import { nodeTypeLabelMap } from '@/game/data'
import { StatChip } from '@/components/ui'
import type { GameSession } from '@/game/types'

export function SectVisitWindow({
  session,
  onBuySectItem,
}: {
  session: GameSession
  onBuySectItem: () => void
}) {
  const currentNode = getCurrentNode(session)
  const saleInfo = getSectSaleInfo(session, currentNode.id)
  const ownedCount = saleInfo ? getItemCount(session, saleInfo.itemName) : 0

  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">拜山</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{currentNode.name}</h3>
        <p className="mt-4 text-sm leading-7 text-[#ead8ba]">
          山门巍峨，灵雾缭绕。你递上拜帖，一名知客弟子引你入内。
          宗门长老听闻商会来访，倒也未加为难，命弟子取出一件秘制之物，言明可用灵石换取。
        </p>
        {saleInfo ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatChip label="宗门类型" value={nodeTypeLabelMap.sect} />
              <StatChip label="特产" value={saleInfo.category === 'talisman' ? '符篆' : saleInfo.category === 'elixir' ? '丹药' : '法宝'} />
              <StatChip label="求购之物" value={saleInfo.itemName} />
              <StatChip label="价格" value={`${saleInfo.price} 灵石`} />
            </div>
            <div className="mt-6 rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm text-[#ead8ba]">
              当前持有：{ownedCount} 枚
            </div>
            <button
              className="action mt-6 w-full"
              onClick={onBuySectItem}
              disabled={session.player.spiritStone < saleInfo.price}
            >
              {session.player.spiritStone < saleInfo.price
                ? `灵石不足（需 ${saleInfo.price}）`
                : `求购一枚 · ${saleInfo.price} 灵石`}
            </button>
          </>
        ) : (
          <div className="mt-6 rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
            此宗门似乎并无对外出售的秘制之物。
          </div>
        )}
      </div>

      <div className="grid gap-4">
        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">秘制之物说明</p>
          <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">用途</h3>
          <div className="mt-4 space-y-3 text-sm leading-7 text-[#ead8ba]">
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              这些秘制之物在探索某些险地时能派上大用场。
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              <strong>金甲符</strong> — 可抵御剑气类机关陷阱
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              <strong>避毒丹</strong> — 可化解毒气类禁制
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              <strong>破阵珠</strong> — 可破除阵法类封印
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
