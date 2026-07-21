import { useEffect, useMemo, useRef, useState } from 'react'
import MapPanel from '@/components/MapPanel'
import TopBar from '@/components/TopBar'
import { categoryLabelMap, nodeTypeLabelMap, productMap, realmLabelMap } from '@/game/data'
import { airshipBackgroundUrl, getNodeBackgroundUrl, mapBackgroundUrl } from '@/game/backgrounds'
import {
  describePendingPlan,
  getAdjacentNodes,
  getBranchIncome,
  getCurrentNode,
  getPendingPlan,
  getProductPrice,
  getSelectedNode,
  getTradableProducts,
  getTravelOption,
  getMoveRangeReachableNodeIds,
} from '@/game/engine'
import { useGameStore } from '@/store/gameStore'
import type { BuildingType, GameSession } from '@/game/types'

type MainView = 'town' | 'airship' | 'map'
type OverlayWindowState =
  | {
      kind: 'rumor' | 'market' | 'branch' | 'manor'
      nodeId: string
    }
  | null

const buildingOptions: { type: BuildingType; label: string }[] = [
  { type: 'hub', label: '集散行' },
  { type: 'alchemy', label: '丹房' },
  { type: 'forge', label: '器坊' },
  { type: 'sigil', label: '符坊' },
  { type: 'auction', label: '拍卖行' },
]

function getRumorVenueCopy(type: GameSession['world']['nodes'][number]['type']) {
  if (type === 'town') {
    return {
      name: '酒楼',
      hallLabel: '酒楼正厅',
      actionLabel: '请客打听',
      entrySubtitle: '打听周边传闻与路讯',
      intro:
        '市楼檐影与灯火留在正中，主要功能收至四周浮动面板。你可以先欣赏城景，再决定是去酒楼打听，还是进入交易所处理货物。',
      detail:
        '灯火、酒碗、散修与商队消息都汇在这里。请客喝上一轮，总能从真假难辨的话头里捞出一两条能用的路线。',
      emptyLine: '今日酒楼里还没有新的可疑消息。',
    }
  }

  if (type === 'sect') {
    return {
      name: '知客亭',
      hallLabel: '知客亭',
      actionLabel: '拜亭问讯',
      entrySubtitle: '向执事弟子打听附近路讯',
      intro:
        '你当前驻泊于宗门地界。主界面仍以山门景致为主，但知客亭始终可供落脚问讯，交易所则只在常规城镇开放。',
      detail:
        '往来弟子、外门执事与借宿商旅的消息都在这里汇集。备下薄礼或茶资，常能换来附近道路与据点的只言片语。',
      emptyLine: '今日知客亭里暂无新的门外消息。',
    }
  }

  return {
    name: '营地',
    hallLabel: '临时营地',
    actionLabel: '整队打探',
    entrySubtitle: '从行脚者与守夜人口中探路',
    intro:
      `你当前驻泊于${nodeTypeLabelMap[type]}。此页仍作为主界面展示，但队伍随行的营地仍可供你整理情报、向过路人探路；交易所则只在常规城镇开放。`,
    detail:
      '火堆旁的守夜人、路过的散修与临时停驻的行商都会留下零碎消息。稍作整队、备些茶水，也能慢慢拼出新的方向。',
    emptyLine: '今夜营地里还没有新的风闻。',
  }
}

export default function MainGamePage({ onNavigate }: { onNavigate: (page: 'game' | 'newGame' | 'saves') => void }) {
  const session = useGameStore((state) => state.session)
  const saves = useGameStore((state) => state.saves)
  const refreshSaves = useGameStore((state) => state.refreshSaves)
  const [saveTitle, setSaveTitle] = useState('')
  const [mainView, setMainView] = useState<MainView>('town')
  const [overlayWindow, setOverlayWindow] = useState<OverlayWindowState>(null)
  const [revealAll, setRevealAll] = useState(false)
  const [showMoveRange, setShowMoveRange] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isExecutingPlan, setIsExecutingPlan] = useState(false)
  const [dialogConfig, setDialogConfig] = useState<{
    title: string
    content: string
    imageUrl?: string
    buttons: { label: string; onClick: () => void }[]
  } | null>(null)
  const introShownRef = useRef(false)

  const selectNode = useGameStore((state) => state.selectNode)
  const tavernRumor = useGameStore((state) => state.tavernRumor)
  const buyProduct = useGameStore((state) => state.buyProduct)
  const sellCargo = useGameStore((state) => state.sellCargo)
  const scheduleTravel = useGameStore((state) => state.scheduleTravel)
  const establishBranch = useGameStore((state) => state.establishBranch)
  const donateToCity = useGameStore((state) => state.donateToCity)
  const createTradeLinkBetween = useGameStore((state) => state.createTradeLinkBetween)
  const removeTradeLink = useGameStore((state) => state.removeTradeLink)
  const buildBuilding = useGameStore((state) => state.buildBuilding)
  const createTradeLink = useGameStore((state) => state.createTradeLink)
  const clearPendingPlan = useGameStore((state) => state.clearPendingPlan)
  const executePendingPlan = useGameStore((state) => state.executePendingPlan)
  const saveCurrent = useGameStore((state) => state.saveCurrent)

  useEffect(() => {
    refreshSaves()
  }, [refreshSaves])

  useEffect(() => {
    if (session && !introShownRef.current) {
      introShownRef.current = true
      const addFunds = () => {
        session.player.spiritStone += 200
      }
      setDialogConfig({
        title: '开拓许可',
        content:
          '你手中的灵材与灵石，是起点，也是唯一可用的本钱。\n\n天灾后的碎片疆域上，商会如野草般生灭。你领到的开拓许可期限有限，在那之前，是建起横跨诸地的商路、让商会名号传遍七十二城，还是灰溜溜地在期限到来前清账离场——全看你自己。\n\n飞舟已泊在码头，地图上尚有大片迷雾。第一步怎么走，你来定。',
        buttons: [
          { label: '心领了，开始吧', onClick: () => setDialogConfig(null) },
          { label: '收下额外支助（+200灵石）', onClick: () => { addFunds(); setDialogConfig(null) } },
        ],
      })
    }
  }, [session])

  const stageStyle = useMemo(
    () => ({
      width: 'min(100vw, calc(100vh * 16 / 9))',
      height: 'min(100vh, calc(100vw * 9 / 16))',
    }),
    [],
  )

  if (!session) return null

  const currentNode = getCurrentNode(session)
  const selectedNode = getSelectedNode(session)
  const pendingPlan = getPendingPlan(session)
  const pendingPlanDescription = describePendingPlan(session, pendingPlan)
  const overlayNode = overlayWindow ? session.world.nodes.find((node) => node.id === overlayWindow.nodeId) ?? currentNode : null

  function openOverlay(kind: NonNullable<OverlayWindowState>['kind'], nodeId: string) {
    setOverlayWindow({ kind, nodeId })
  }

  if (session.world.ending) {
    return (
      <main className="min-h-screen bg-[#1b130a] px-6 py-8 text-[#f7edd7]">
        <div className="mx-auto max-w-4xl rounded-[24px] border border-[#7d5a34]/60 bg-[linear-gradient(180deg,rgba(48,32,20,0.98),rgba(33,22,14,0.96))] p-10 text-center shadow-[0_30px_120px_rgba(36,20,8,0.6)]">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-200/55">结局</p>
          <h1 className="mt-4 font-serif text-4xl text-[#fff4dd]">{session.world.ending.title}</h1>
          <p className="mt-6 text-sm leading-7 text-[#e6d3b0]">{session.world.ending.summary}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Score label="探索" value={session.world.ending.scores.exploration} />
            <Score label="商号" value={session.world.ending.scores.commerce} />
            <Score label="网络" value={session.world.ending.scores.network} />
            <Score label="资金" value={session.world.ending.scores.capital} />
          </div>
          <p className="mt-6 text-xl text-[#fff4dd]">总评：{session.world.ending.totalScore}</p>
          <div className="mt-8 flex justify-center gap-3">
            <button className="action" onClick={() => onNavigate('newGame')}>再开一局</button>
            <button className="action" onClick={() => onNavigate('saves')}>前往存档</button>
          </div>
        </div>
      </main>
    )
  }

  async function handleExecutePendingPlan() {
    if (isExecutingPlan) return
    setIsExecutingPlan(true)
    await new Promise((resolve) => window.setTimeout(resolve, 320))
    executePendingPlan()
    await new Promise((resolve) => window.setTimeout(resolve, 620))
    setIsExecutingPlan(false)
  }

  return (
    <main className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(145,98,36,0.15),transparent_25%),radial-gradient(circle_at_bottom,rgba(32,78,60,0.12),transparent_28%),linear-gradient(180deg,#2d1f12,#1a130c)] text-[#f7edd7]">
      <div className="relative mx-auto my-auto" style={stageStyle}>
        <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-[#7a5832]/55 bg-[linear-gradient(180deg,rgba(38,25,16,0.98),rgba(28,19,13,0.97))] shadow-[0_40px_140px_rgba(26,15,6,0.72)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,211,133,0.12),transparent_26%),radial-gradient(circle_at_bottom,rgba(78,103,84,0.16),transparent_32%)]" />

          <div className="absolute inset-x-4 top-2.5 z-20">
            <TopBar
              session={session}
              activeView={mainView}
              planTitle={pendingPlanDescription.title}
              hasPendingPlan={Boolean(pendingPlan)}
              isExecutingPlan={isExecutingPlan}
              onChangeView={setMainView}
              onExecuteTurn={handleExecutePendingPlan}
              onClearPlan={pendingPlan ? clearPendingPlan : undefined}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>

          <div className="relative min-h-0 flex-1 px-4 pb-4 pt-[128px]">
            <section className="relative h-full overflow-hidden rounded-[22px] border border-[#7a5832]/40 bg-[linear-gradient(180deg,rgba(27,18,12,0.64),rgba(22,15,10,0.48))] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.02)]">
              {mainView === 'town' ? (
                <TownStage
                  session={session}
                  onOpenRumor={() => openOverlay('rumor', currentNode.id)}
                  onOpenMarket={() => openOverlay('market', currentNode.id)}
                  onOpenBranch={() => openOverlay('branch', currentNode.id)}
                  onOpenManor={() => openOverlay('manor', currentNode.id)}
                />
              ) : null}
              {mainView === 'airship' ? (
                <AirshipStage session={session} />
              ) : null}
              {mainView === 'map' ? (
                <MapStage
                  session={session}
                  revealAll={revealAll}
                  showMoveRange={showMoveRange}
                  selectedNode={selectedNode}
                  pendingPlan={pendingPlan}
                  onSelectNode={selectNode}
                  onToggleReveal={() => setRevealAll((value) => !value)}
                  onToggleMoveRange={() => setShowMoveRange((value) => !value)}
                  onScheduleTravel={scheduleTravel}
                  onOpenBranch={() => openOverlay('branch', selectedNode.id)}
                  onCreateTradeLink={createTradeLinkBetween}
                  onRemoveTradeLink={removeTradeLink}
                />
              ) : null}
            </section>
          </div>

          {overlayWindow && overlayNode ? (
            <OverlayFrame
              title={
                overlayWindow.kind === 'rumor'
                  ? `${overlayNode.name} · ${getRumorVenueCopy(overlayNode.type).name}`
                  : overlayWindow.kind === 'market'
                    ? `${overlayNode.name} · 交易所`
                    : overlayWindow.kind === 'branch'
                      ? `${overlayNode.name} · 商会账房`
                      : `${overlayNode.name} · 城主府`
              }
              onClose={() => setOverlayWindow(null)}
            >
              {overlayWindow.kind === 'rumor' ? (
                <TavernWindow
                  session={session}
                  nodeId={overlayNode.id}
                  venue={getRumorVenueCopy(overlayNode.type)}
                  onTavernRumor={tavernRumor}
                />
              ) : null}
              {overlayWindow.kind === 'market' ? (
                <MarketWindow session={session} nodeId={overlayNode.id} onBuyProduct={buyProduct} onSellCargo={sellCargo} />
              ) : null}
              {overlayWindow.kind === 'branch' ? (
                <BranchWindow
                  session={session}
                  nodeId={overlayNode.id}
                  onBuildBuilding={buildBuilding}
                />
              ) : null}
              {overlayWindow.kind === 'manor' ? (
                <ManorWindow
                  session={session}
                  nodeId={overlayNode.id}
                  onEstablishBranch={establishBranch}
                  onDonateToCity={donateToCity}
                />
              ) : null}
            </OverlayFrame>
          ) : null}

          {settingsOpen ? (
            <OverlayFrame title="设定与存档" onClose={() => setSettingsOpen(false)}>
              <SettingsWindow
                saves={saves}
                saveTitle={saveTitle}
                onSaveTitleChange={setSaveTitle}
                onSave={() => {
                  saveCurrent(saveTitle.trim() || '手动存档')
                  setSaveTitle('')
                }}
                onOpenSaves={() => onNavigate('saves')}
                onNewGame={() => onNavigate('newGame')}
              />
            </OverlayFrame>
          ) : null}

          {dialogConfig ? (
            <DialogWindow
              title={dialogConfig.title}
              content={dialogConfig.content}
              imageUrl={dialogConfig.imageUrl}
              buttons={dialogConfig.buttons}
            />
          ) : null}

          {isExecutingPlan ? <TurnAdvanceOverlay planLabel={pendingPlanDescription.actionLabel} /> : null}
        </div>
      </div>
    </main>
  )
}

function CompactPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-5 shadow-[0_16px_60px_rgba(31,20,9,0.35)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,226,170,0.45),transparent)]" />
      <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{title}</p>
      <h2 className="mt-2 font-serif text-lg text-[#fff4dd]">{subtitle}</h2>
      <div className="relative mt-4">{children}</div>
    </section>
  )
}

function FloatingPanel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`pointer-events-auto relative overflow-hidden rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-4 shadow-[0_22px_60px_rgba(20,11,5,0.34)] ${className}`}>
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,231,186,0.42),transparent)]" />
      <div className="pointer-events-none absolute inset-y-4 left-0 w-px bg-[linear-gradient(180deg,transparent,rgba(214,170,102,0.32),transparent)]" />
      <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{title}</p>
      <h2 className="mt-2 font-serif text-lg text-[#fff4dd]">{subtitle}</h2>
      <div className="relative mt-4">{children}</div>
    </section>
  )
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(92,61,36,0.9),rgba(58,38,24,0.88))] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.22em] text-amber-100/40">{label}</div>
      <div className="mt-2 text-base text-[#fff4dd]">{value}</div>
    </div>
  )
}

function DisabledAction({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-[#6f5334]/35 bg-[linear-gradient(180deg,rgba(66,44,28,0.88),rgba(44,30,20,0.85))] px-4 py-4 text-sm text-[#b59a72]">
      {label}
      <span className="ml-2 text-xs text-[#a38a66]">预留</span>
    </div>
  )
}

function TownStage({
  session,
  onOpenRumor,
  onOpenMarket,
  onOpenBranch,
  onOpenManor,
}: {
  session: GameSession
  onOpenRumor: () => void
  onOpenMarket: () => void
  onOpenBranch: () => void
  onOpenManor: () => void
}) {
  const currentNode = getCurrentNode(session)
  const inTown = currentNode.type === 'town'
  const rumorVenue = getRumorVenueCopy(currentNode.type)
  const recentLogs = session.world.logs.slice(0, 4)
  const backgroundUrl = getNodeBackgroundUrl(currentNode.type, currentNode.id, session.world.seed)
  const specialties = getTradableProducts(session, currentNode).map((productId) => productMap[productId]).filter(Boolean)

  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,rgba(101,60,18,0.18),rgba(27,18,11,0.92)_76%)]">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-72" style={{ backgroundImage: `url("${backgroundUrl}")` }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,237,182,0.22),transparent_24%),linear-gradient(180deg,rgba(31,20,12,0.1),rgba(12,8,6,0.72)_78%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(15,10,7,0.84))]" />

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

      <div className="absolute bottom-5 left-5 w-80">
        <FloatingPanel title="城中近况" subtitle="风闻与账册">
          <div className="grid gap-2">
            {(recentLogs.length ? recentLogs : ['今日城中一切如常，尚无新的可记之事。']).map((log, index) => (
              <div key={`${log}-${index}`} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm text-[#ead8ba]">
                {log}
              </div>
            ))}
          </div>
        </FloatingPanel>
      </div>

      <div className="absolute right-5 top-1/2 flex w-72 -translate-y-1/2 flex-col gap-3">
        <SceneAction title={rumorVenue.name} subtitle={rumorVenue.entrySubtitle} onClick={onOpenRumor} />
        {inTown ? <SceneAction title="交易所" subtitle="办理原产商品买卖" onClick={onOpenMarket} /> : null}
        {inTown ? <SceneAction title="城主府" subtitle="设立商号或捐赠灵石" onClick={onOpenManor} /> : null}
        {currentNode.branchId ? (
          <SceneAction title="本地商会" subtitle="查看本地账册与商路记档" onClick={onOpenBranch} />
        ) : null}
      </div>
    </div>
  )
}

function AirshipStage({ session }: { session: GameSession }) {
  return (
    <div className="relative h-full overflow-hidden bg-[linear-gradient(180deg,rgba(66,56,34,0.38),rgba(20,14,11,0.96)_76%)]">
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-68" style={{ backgroundImage: `url("${airshipBackgroundUrl}")` }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(236,255,216,0.16),transparent_18%),linear-gradient(180deg,rgba(15,17,19,0.08),rgba(12,10,8,0.72)_78%)]" />

      <div className="pointer-events-none absolute inset-x-[18%] top-[15%] text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/45">飞舟 / 商会总部</p>
        <h2 className="mt-4 font-serif text-5xl text-[#eef6dd]">云海飞舟</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#d7d7bf]">
          飞舟页现在是总部总览场景。中间保持云海与舟身的观看空间，编制与成长上限收在四周悬浮面板里，后续若加入升级，再从这些入口展开。
        </p>
      </div>

      <div className="absolute left-5 top-5 w-72">
        <FloatingPanel title="总部概览" subtitle="飞舟编制">
          <div className="grid grid-cols-2 gap-3">
            <StatChip label="移动" value={session.player.moveRange} />
            <StatChip label="商路上限" value={session.player.tradeLinkCapacity} />
            <StatChip label="供奉编制" value={session.player.retainerCapacity} />
            <StatChip label="货仓容量" value={session.player.cargoCapacity} />
          </div>
        </FloatingPanel>
      </div>

      <div className="absolute right-5 top-10 w-72">
        <FloatingPanel title="预留模块" subtitle="后续可扩展">
          <div className="grid gap-2">
            <DisabledAction label="飞舟升级" />
            <DisabledAction label="船舱扩建" />
            <DisabledAction label="编制扩编" />
          </div>
        </FloatingPanel>
      </div>

    </div>
  )
}

function MapStage({
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
  selectedNode: ReturnType<typeof getSelectedNode>
  pendingPlan: ReturnType<typeof getPendingPlan>
  onSelectNode: (nodeId: string) => void
  onToggleReveal: () => void
  onToggleMoveRange: () => void
  onScheduleTravel: (nodeId: string) => void
  onOpenBranch: () => void
  onCreateTradeLink: (fromNodeId: string, toNodeId: string) => void
  onRemoveTradeLink: (linkId: string) => void
}) {
  const currentNode = getCurrentNode(session)
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
              <StatChip label="类型" value={nodeTypeLabelMap[selectedNode.type]} />
              {selectedNode.type === 'town' ? <StatChip label="繁荣" value={selectedNode.prosperity ?? 0} /> : null}
              <StatChip label="商号收益" value={selectedNode.branchId ? getBranchIncome(session, selectedNode.id) : 0} />
            </div>
            <div className="mt-3 rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
              <div className="text-xs uppercase tracking-[0.24em] text-amber-100/40">本地特产</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(() => {
                  const tradableIds = getTradableProducts(session, selectedNode)
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
          <FloatingPanel title="商路管理" subtitle={`${session.guild.tradeLinks.length}/${session.player.tradeLinkCapacity}`} className="min-h-0 flex-1 flex flex-col">
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

function TurnAdvanceOverlay({ planLabel }: { planLabel: string }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(85,55,27,0.16),rgba(18,12,8,0.84))] backdrop-blur-[2px]">
      <div className="relative w-[360px] overflow-hidden rounded-[20px] border border-[#8b6840]/65 bg-[linear-gradient(180deg,rgba(52,35,22,0.98),rgba(29,20,13,0.97))] px-6 py-6 text-center shadow-[0_26px_80px_rgba(15,9,5,0.72)]">
        <p className="text-xs uppercase tracking-[0.38em] text-amber-100/45">回合推进</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{planLabel}</h3>
        <p className="mt-3 text-sm leading-6 text-[#dcc5a0]">商会正在调度飞舟、账册与路引，请稍候片刻。</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full border border-[#7f5d38]/55 bg-[#2f2116]">
          <div className="h-full w-full origin-left animate-[turn-progress_0.9s_ease-out_forwards] bg-[linear-gradient(90deg,#7c5432,#d8b073,#f3deb1)]" />
        </div>
      </div>
    </div>
  )
}

function DialogWindow({
  title,
  content,
  imageUrl,
  buttons,
}: {
  title: string
  content: string
  imageUrl?: string
  buttons: { label: string; onClick: () => void }[]
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      <div className="relative w-[480px] max-w-[86%] overflow-hidden rounded-[20px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-6 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,229,177,0.42),transparent)]" />
        <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">消息</p>
        <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
        {imageUrl ? (
          <img src={imageUrl} alt="" className="mt-4 w-full rounded-[14px] border border-[#7a5a36]/50 object-cover" />
        ) : null}
        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#ead8ba]">{content}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {buttons.map((button, index) => (
            <button key={index} className="action" onClick={button.onClick}>
              {button.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverlayFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      <div className="relative flex h-[82%] w-[86%] flex-col overflow-hidden rounded-[22px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-5 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">子窗口</p>
            <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
          </div>
          <button className="action" onClick={onClose}>返回</button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function TavernWindow({
  session,
  nodeId,
  venue,
  onTavernRumor,
}: {
  session: GameSession
  nodeId: string
  venue: ReturnType<typeof getRumorVenueCopy>
  onTavernRumor: () => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const isLocal = targetNode.id === currentNode.id
  const [localRumors, setLocalRumors] = useState<string[]>([])
  const prevLogsLengthRef = useRef(session.world.logs.length)
  useEffect(() => {
    const logs = session.world.logs
    if (logs.length > prevLogsLengthRef.current) {
      const newCount = logs.length - prevLogsLengthRef.current
      const newLogs = logs.slice(0, newCount)
      const rumorLogs = newLogs.filter(
        (log) => log.includes('酒') || log.includes('线索') || log.includes('路') || log.includes('逸闻'),
      )
      if (rumorLogs.length > 0) {
        setLocalRumors((prev) => [...prev, ...rumorLogs])
      }
    }
    prevLogsLengthRef.current = logs.length
  }, [session.world.logs])
  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(111,60,25,0.86),rgba(43,29,19,0.96))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-200/55">{venue.hallLabel}</p>
        <h3 className="mt-4 font-serif text-3xl text-[#fff4dd]">{targetNode.name}</h3>
        <p className="mt-4 text-sm leading-7 text-[#ead8ba]">{venue.detail}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatChip label="当前灵石" value={session.player.spiritStone} />
          <StatChip label="打听花费" value={session.config.exploration.tavernRumorCost} />
        </div>
        <button className="action mt-6" onClick={onTavernRumor} disabled={!isLocal}>
          {isLocal ? venue.actionLabel : '异地只可查阅，不可当场打听'}
        </button>
      </div>
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">听来的话</p>
        <div className="mt-4 grid gap-3">
          {(localRumors.length ? localRumors : [venue.emptyLine]).map((log, index) => (
            <div key={`${log}-${index}`} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm text-[#ead8ba]">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MarketWindow({
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
  return (
    <div className="grid h-full grid-cols-[1.15fr_0.85fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">交易所</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">本地特产</h3>
        <div className="mt-4 grid gap-3">
          {tradableProducts.map((productId) => {
            const product = productMap[productId]
            const entry = targetNode.inventory[productId]
            return (
              <div key={productId} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#fff4dd]">{product.name}</p>
                    <p className="mt-1 text-xs text-[#cdb48a]">
                      {realmLabelMap[product.realm]} · {categoryLabelMap[product.category]} · 库存 {entry?.quantity ?? 1}/{entry?.max ?? 1}
                    </p>
                  </div>
                  <button className="action !px-3 !py-2" onClick={() => onBuyProduct(productId)} disabled={!isLocal}>
                    {isLocal ? `购入 ${getProductPrice(session, targetNode, productId, 'buy')}` : `查阅 ${getProductPrice(session, targetNode, productId, 'buy')}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isLocal ? '货仓' : '查档说明'}</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{isLocal ? '已载大宗货物' : '异地交易档案'}</h3>
        <div className="mt-4 grid gap-3">
          {isLocal && session.player.cargo.length ? (
            session.player.cargo.map((cargo) => {
              const sellPrice = getProductPrice(session, currentNode, cargo.productId, 'sell') ?? 0
              const profit = sellPrice - cargo.cost
              return (
                <button
                  key={cargo.id}
                  className="flex items-start justify-between rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(91,60,35,0.94),rgba(58,38,24,0.92))] px-4 py-3 text-left text-sm text-[#fff4dd] transition hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))]"
                  onClick={() => onSellCargo(cargo.id)}
                >
                  <div>
                    <div>{productMap[cargo.productId].name}</div>
                    <div className="mt-1 text-xs text-[#cdb48a]">
                      成本 {cargo.cost} · 现售 {sellPrice} · 本仓{profit >= 0 ? `盈利 +${profit}` : `亏损 ${profit}`}
                    </div>
                  </div>
                  <span className="rounded-full border border-[#c19154]/50 bg-[rgba(247,224,186,0.08)] px-3 py-1 text-xs text-[#fff4dd]">售出</span>
                </button>
              )
            })
          ) : isLocal ? (
            <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">当前货仓为空。</div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm leading-6 text-[#cdb48a]">
              当前只是从其他主界面翻阅 {targetNode.name} 的货品账档，还不能直接在异地完成买卖。后续如果要把“查看产出”做成共用窗口，也可以继续沿用这里。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TradeLinkPanel({
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
  const isFull = session.guild.tradeLinks.length >= session.player.tradeLinkCapacity
  const canCreate = fromId && toId && fromId !== toId && !isFull

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
          disabled={isFull}
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
          disabled={isFull}
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
          {isFull ? '商路已达上限' : `开辟商路（维护 ${session.config.economy.tradeLinkMaintenance}）`}
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

function ManorWindow({
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

function BranchWindow({
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
  const currentHasBranch = Boolean(currentNode.branchId)
  const hasLinkToCurrent =
    targetNode.id !== currentNode.id &&
    session.guild.tradeLinks.some(
      (link) => [link.fromNodeId, link.toNodeId].includes(currentNode.id) && [link.fromNodeId, link.toNodeId].includes(targetNode.id),
    )
  const localLinkCandidates = session.guild.branches
    .filter((branch) => branch.nodeId !== targetNode.id)
    .map((branch) => session.world.nodes.find((node) => node.id === branch.nodeId))
    .filter((node): node is NonNullable<typeof node> => Boolean(node))

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
                ? '你此刻正驻留在这处分号，因此这里额外补充了“本地”视角。后续若加入驻地委任、仓储或本地特权，都适合放在这一块。'
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

function TownSidebar({
  session,
  currentNode,
}: {
  session: GameSession
  currentNode: ReturnType<typeof getCurrentNode>
}) {
  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4">
      <CompactPanel title="当前城镇" subtitle={currentNode.name}>
        <div className="grid grid-cols-2 gap-3">
          <StatChip label="类型" value={nodeTypeLabelMap[currentNode.type]} />
          {currentNode.type === 'town' ? <StatChip label="繁荣" value={currentNode.prosperity ?? 0} /> : null}
          <StatChip label="货仓" value={`${session.player.cargo.length}/${session.player.cargoCapacity}`} />
        </div>
      </CompactPanel>

      <section className="min-h-0 rounded-[26px] border border-amber-800/20 bg-[#2b1d12]/78 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">城中近况</p>
          <h2 className="mt-2 font-serif text-lg text-[#fff4dd]">风闻与账册</h2>
        </div>
        <div className="mt-4 grid gap-2">
          {session.world.logs.slice(0, 5).map((log, index) => (
            <div key={`${log}-${index}`} className="rounded-2xl border border-amber-800/20 bg-[#f7edd7]/6 px-4 py-3 text-sm text-[#ead8ba]">
              {log}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AirshipSidebar({
  session,
}: {
  session: GameSession
}) {
  return (
    <div className="grid min-h-0 grid-rows-[auto_1fr] gap-4">
      <CompactPanel title="总部概览" subtitle="飞舟编制">
        <div className="grid grid-cols-2 gap-3">
          <StatChip label="移动" value={session.player.moveRange} />
          <StatChip label="商路上限" value={session.player.tradeLinkCapacity} />
          <StatChip label="供奉编制" value={session.player.retainerCapacity} />
          <StatChip label="货仓容量" value={session.player.cargoCapacity} />
        </div>
      </CompactPanel>

      <section className="min-h-0 rounded-[26px] border border-amber-800/20 bg-[#2b1d12]/78 p-5">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">总部注记</p>
        <div className="mt-4 grid gap-3 text-sm leading-7 text-[#ead8ba]">
          <div className="rounded-2xl border border-amber-800/20 bg-[#f7edd7]/6 px-4 py-3">飞舟页当前仅作全局数值总览，不展示当前城镇或当前选中据点。</div>
          <div className="rounded-2xl border border-amber-800/20 bg-[#f7edd7]/6 px-4 py-3">后续若加入升级，可从这里扩展移动力、贸易连接名额与供奉数量成长。</div>
          <div className="rounded-2xl border border-amber-800/20 bg-[#f7edd7]/6 px-4 py-3">局内设定、存档与新局入口已统一收纳到顶部设定窗口。</div>
        </div>
      </section>
    </div>
  )
}

function SettingsWindow({
  saves,
  saveTitle,
  onSaveTitleChange,
  onSave,
  onOpenSaves,
  onNewGame,
}: {
  saves: { id: string; title: string; turn: number; spiritStone: number; savedAt: string }[]
  saveTitle: string
  onSaveTitleChange: (value: string) => void
  onSave: () => void
  onOpenSaves: () => void
  onNewGame: () => void
}) {
  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">局内管理</p>
        <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">存档与设定</h3>
        <div className="mt-5 space-y-3">
          <input
            className="w-full rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(88,58,35,0.92),rgba(56,37,24,0.9))] px-4 py-2 text-sm text-[#fff4dd] outline-none placeholder:text-[#cdb48a]"
            value={saveTitle}
            onChange={(event) => onSaveTitleChange(event.target.value)}
            placeholder="手动存档"
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="action" onClick={onSave}>保存当前局面</button>
            <button className="action" onClick={onOpenSaves}>打开存档页</button>
            <button className="action col-span-2" onClick={onNewGame}>开始新局</button>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">最近存档</p>
        <div className="mt-4 grid gap-3">
          {saves.length ? (
            saves.slice(0, 5).map((save) => (
              <div key={save.id} className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3 text-sm text-[#ead8ba]">
                <div className="font-medium text-[#fff4dd]">{save.title}</div>
                <div className="mt-2 text-[#cdb48a]">回合 {save.turn} · 灵石 {save.spiritStone}</div>
                <div className="mt-1 text-[#b49367]">{new Date(save.savedAt).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-4 py-4 text-sm text-[#cdb48a]">
              还没有创建任何存档。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SceneAction({
  title,
  subtitle,
  onClick,
  disabled = false,
}: {
  title: string
  subtitle: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'relative overflow-hidden rounded-[16px] border px-5 py-5 text-left transition',
        disabled
          ? 'cursor-not-allowed border-[#6f5334]/35 bg-[linear-gradient(180deg,rgba(66,44,28,0.88),rgba(44,30,20,0.85))] text-[#8d7654]'
          : 'border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(70,46,29,0.97),rgba(43,29,19,0.95))] text-[#fff4dd] hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(96,64,37,0.98),rgba(58,39,24,0.95))]',
      ].join(' ')}
    >
      <div className="text-xs uppercase tracking-[0.28em] text-amber-100/40">入口</div>
      <div className="mt-2 font-serif text-2xl">{title}</div>
      <div className="mt-3 text-sm text-[#d8c2a0]">{subtitle}</div>
    </button>
  )
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-[12px] border px-4 py-2 text-sm transition',
        active
          ? 'border-[#c19154]/65 bg-[linear-gradient(180deg,rgba(99,65,38,0.98),rgba(61,40,25,0.95))] text-[#fff4dd]'
          : 'border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(85,57,35,0.88),rgba(54,36,24,0.86))] text-[#d8c2a0] hover:border-[#c19154]/65 hover:bg-[linear-gradient(180deg,rgba(98,66,40,0.92),rgba(62,41,27,0.9))]',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-amber-100/40">{label}</p>
      <p className="mt-2 text-2xl text-[#fff4dd]">{value}</p>
    </div>
  )
}
