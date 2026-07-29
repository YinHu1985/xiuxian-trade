import { getCurrentNode, getTradableProducts } from '@/game/engine'
import { productMap, nodeTypeLabelMap } from '@/game/data'
import { getNodeBackgroundUrl } from '@/game/backgrounds'
import { FloatingPanel, StatChip, SceneAction } from '@/components/ui'
import type { GameSession } from '@/game/types'

export function getRumorVenueCopy(type: GameSession['world']['nodes'][number]['type']) {
  if (type === 'town') {
    return {
      name: '酒楼',
      hallLabel: '酒楼正厅',
      actionLabel: '请客打听',
      entrySubtitle: '打听周边传闻与路讯',
      intro:
        '市楼檐影与灯火留在正中，主要功能收至四周浮动面板。你可以先欣赏城景，再决定是去酒楼打听，还是进入交易所处理货物。',
      detail:
        '酒楼里茶客高谈阔论，说书人醒木拍案，各路消息在此汇聚。你吩咐店小二烫上一壶灵茶，竖耳细听四座的闲谈。',
      emptyLine: '还没听到什么新鲜的传闻……',
    }
  }
  if (type === 'sect') {
    return {
      name: '知客亭',
      hallLabel: '知客亭',
      actionLabel: '通报拜会',
      entrySubtitle: '拜会宗门长老与弟子',
      intro:
        '山门前的知客亭里，往来修士递贴候见。此地虽无繁华市井，却也另有一番清修气象。',
      detail:
        '知客亭的茶寮中，几位外门弟子正在低声议论近来的宗门动向。你递上一张拜帖，静候传召。',
      emptyLine: '亭中暂时无人带来新鲜消息……',
    }
  }
  return {
    name: '营地',
    hallLabel: '营地',
    actionLabel: '打听探索',
    entrySubtitle: '探索废墟外的传闻',
    intro:
      '废墟外围，几顶帐篷零星散落，风化的石墙与野草掩映着曾经的繁华。',
    detail:
      '营地里的老修士把酒壶递给你，用下巴指了指远处的残垣断壁："那边最近有些异动，不知道又翻出了什么好东西。"',
    emptyLine: '营火噼啪作响，没人带来新消息……',
  }
}

export function TownStage({
  session,
  onOpenRumor,
  onOpenMarket,
  onOpenBranch,
  onOpenManor,
  onOpenSectVisit,
  onOpenRuinExplore,
}: {
  session: GameSession
  onOpenRumor: () => void
  onOpenMarket: () => void
  onOpenBranch: () => void
  onOpenManor: () => void
  onOpenSectVisit?: () => void
  onOpenRuinExplore?: () => void
}) {
  const currentNode = getCurrentNode(session)
  const rumorVenue = getRumorVenueCopy(currentNode.type)
  const backgroundUrl = getNodeBackgroundUrl(currentNode.type, currentNode.id, session.world.seed)
  const specialties = getTradableProducts(session, currentNode).map((productId) => productMap[productId]).filter(Boolean)

  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,rgba(101,60,18,0.18),rgba(27,18,11,0.92)_76%)]">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-72" style={{ backgroundImage: `url("${backgroundUrl}")` }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,237,182,0.22),transparent_24%),linear-gradient(180deg,rgba(31,20,12,0.1),rgba(12,8,6,0.72)_78%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(15,10,7,0.84))]" />

      <div className="pointer-events-none absolute inset-x-[20%] top-[14%] text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-100/55">{nodeTypeLabelMap[currentNode.type]}主界面</p>
        <h2 className="mt-4 font-serif text-5xl text-[#fff4dd] drop-shadow-[0_10px_30px_rgba(0,0,0,0.32)]">{currentNode.name}</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#ead8ba]">
          {rumorVenue.intro}
        </p>
      </div>

      <div className="absolute left-5 top-5 w-72">
        <FloatingPanel title="当前驻留" subtitle={currentNode.name}>
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="类型" value={nodeTypeLabelMap[currentNode.type]} />
            {currentNode.type === 'town' ? <StatChip label="繁荣" value={currentNode.prosperity ?? 0} /> : null}
            <StatChip label="本地声望" value={currentNode.reputation} />
            <StatChip label="货仓" value={`${session.player.cargo.length}/${session.player.cargoCapacity}`} />
          </div>
          <div className="mt-4 rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.24em] text-amber-100/40">此地特产</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialties.map((product) => (
                <span
                  key={product.id}
                  className="rounded-full border border-[#b88b54]/35 bg-[rgba(247,224,186,0.08)] px-3 py-1 text-xs text-[#f1dfbf]"
                >
                  {product.name}
                </span>
              ))}
            </div>
          </div>
        </FloatingPanel>
      </div>



      <div className="absolute right-5 top-1/2 flex w-72 -translate-y-1/2 flex-col gap-3">
        <SceneAction title={rumorVenue.name} subtitle={rumorVenue.entrySubtitle} onClick={onOpenRumor} />
        {currentNode.type === 'town' ? <SceneAction title="交易所" subtitle="办理原产商品买卖" onClick={onOpenMarket} /> : null}
        {currentNode.type === 'town' ? <SceneAction title="城主府" subtitle="设立商号或捐赠灵石" onClick={onOpenManor} /> : null}
        {currentNode.type === 'sect' && onOpenSectVisit ? <SceneAction title="拜山" subtitle="求购宗门秘制之物" onClick={onOpenSectVisit} /> : null}
        {currentNode.type === 'ruin' && onOpenRuinExplore ? <SceneAction title="遗迹探索" subtitle="深入秘境寻宝" onClick={onOpenRuinExplore} /> : null}
        {currentNode.branchId ? (
          <SceneAction title="本地商会" subtitle="查看本地账册与商路记档" onClick={onOpenBranch} />
        ) : null}
      </div>
    </div>
  )
}
