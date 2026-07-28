import { getCurrentNode, getBranchIncome } from '@/game/engine'
import { nodeTypeLabelMap } from '@/game/data'
import { StatChip } from '@/components/ui'
import type { BuildingType, GameSession } from '@/game/types'

export { buildingOptions };

const buildingOptions: { type: BuildingType; label: string }[] = [
  { type: 'hub', label: '集散行' },
  { type: 'alchemy', label: '丹房' },
  { type: 'forge', label: '器坊' },
  { type: 'sigil', label: '符坊' },
  { type: 'auction', label: '拍卖行' },
]

export function ManorWindow({
  session,
  nodeId,
  onEstablishBranch,
  onDonateToCity,
}: {
  session: GameSession
  nodeId: string
  onEstablishBranch: () => void
  onDonateToCity: () => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const isLocal = targetNode.id === currentNode.id
  const canEstablishHere = isLocal && targetNode.type === 'town' && targetNode.discovery === 'confirmed' && !targetNode.branchId
  const hasBranch = Boolean(targetNode.branchId)
  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">城主府</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{targetNode.name} · 城主府</h3>
        <p className="mt-4 text-sm leading-7 text-[#ead8ba]">
          府衙案上堆着卷宗与舆图，城中大小事务皆可在此落印定夺。
        </p>
        {canEstablishHere ? (
          <button className="action mt-6" onClick={onEstablishBranch}>
            设立商号
          </button>
        ) : (
          <div className="mt-6 rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
            {hasBranch ? '此地已有商号，无需再立。' : '暂未满足条件（需返回城镇主界面操作，且城镇已确认、尚未设立商号）。'}
          </div>
        )}
      </div>
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">乡绅捐助</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">捐赠灵石</h3>
        <p className="mt-4 text-sm leading-7 text-[#ead8ba]">
          向城中府库捐赠灵石可提振繁荣度。每捐赠 100 灵石，繁荣度 +1（上限 10）。
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatChip label="当前灵石" value={session.player.spiritStone} />
          <StatChip label="当前繁荣" value={targetNode.prosperity ?? 0} />
        </div>
        <button className="action mt-6" onClick={onDonateToCity} disabled={!isLocal}>
          {isLocal ? '捐赠 100 灵石' : '异地不可捐赠'}
        </button>
      </div>
    </div>
  )
}

export function BranchWindow({
  session,
  nodeId,
  onBuildBuilding,
}: {
  session: GameSession
  nodeId: string
  onBuildBuilding: (nodeId: string, type: BuildingType) => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const targetBranch = session.guild.branches.find((branch) => branch.nodeId === targetNode.id)
  const isLocal = targetNode.id === currentNode.id
  const targetBuildings = targetBranch
    ? targetBranch.buildingIds
        .map((id) => session.guild.buildings.find((building) => building.id === id))
        .filter((building): building is NonNullable<typeof building> => Boolean(building))
    : []
  const targetLinks = session.guild.tradeLinks.filter((link) => link.fromNodeId === targetNode.id || link.toNodeId === targetNode.id)

  return (
    <div className="grid h-full grid-cols-[0.95fr_1.05fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isLocal ? '本地商会' : '分号账房'}</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{targetNode.name} {targetBranch ? '分号' : '商会界面'}</h3>
        <p className="mt-4 text-sm leading-7 text-[#ead8ba]">
          {targetBranch
            ? '这是一套统一的商会账房界面。无论从城镇主界面进入，还是从地图选中某处分号进入，看到的都是同一套账册、营建与连接视图。'
            : '此地目前还没有设立分号。你仍可以从这里查看该处据点信息，但商会账册尚未正式展开。'}
        </p>
        {targetBranch ? (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatChip label="据点类型" value={nodeTypeLabelMap[targetNode.type]} />
            <StatChip label="预计收益" value={targetBranch ? getBranchIncome(session, targetNode.id) : 0} />
            <StatChip label="建筑数" value={targetBuildings.length} />
            <StatChip label="关联商路" value={targetLinks.length} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">账房记录</p>
          <div className="mt-4 grid gap-3">
            {targetBuildings.length ? (
              targetBuildings.map((building) => (
                <div key={building.id} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm text-[#ead8ba]">
                  已设 {building.type === 'hub' ? '集散行' : building.type === 'alchemy' ? '丹房' : building.type === 'forge' ? '器坊' : building.type === 'sigil' ? '符坊' : '拍卖行'}
                </div>
              ))
            ) : (
              <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
                {targetBranch ? '分号尚未添置建筑，账房里只有空白册页与未盖章的木匣。' : '此地尚未立号，因此还没有可查的建筑记录。'}
              </div>
            )}
            {targetBranch ? (
              <div className="grid grid-cols-2 gap-2">
                {buildingOptions.map((building) => (
                  <button
                    key={building.type}
                    className="rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(91,60,35,0.94),rgba(58,38,24,0.92))] px-3 py-3 text-sm text-[#fff4dd] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))]"
                    onClick={() => onBuildBuilding(targetNode.id, building.type)}
                  >
                    新建{building.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isLocal ? '本地补充' : '驻点注记'}</p>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-[#ead8ba]">
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              {isLocal
                ? '你此刻正驻留在这处分号，因此这里额外补充了"本地"视角。后续若加入驻地委任、仓储或本地特权，都适合放在这一块。'
                : '当前版本里，异地打开商会窗口时主要用于查账、营建与查看连接状况，不再额外显示驻地专属小功能。'}
            </div>
            <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              后续适合接入的内容包括：驻点委任、建筑切换、收益账本、商路汇总与本地仓储。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
