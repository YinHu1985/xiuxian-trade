import { useEffect, useMemo, useRef, useState } from 'react'
import MapPanel from '@/components/MapPanel'
import TopBar from '@/components/TopBar'
import { categoryLabelMap, nodeTypeLabelMap, productMap, realmLabelMap } from '@/game/data'
import { airshipBackgroundUrl, getNodeBackgroundUrl, mapBackgroundUrl } from '@/game/backgrounds'
import {
  describePendingPlan,
  generateNodeQuests,
  getAdjacentNodes,
  getBranchIncome,
  getCompletableQuests,
  getCurrentNode,
  getNodeQuests,
  getPendingPlan,
  getProductPrice,
  getSelectedNode,
  getTradableProducts,
  getTravelOption,
  getMoveRangeReachableNodeIds,
  hasItem,
  getItemCount,
} from '@/game/engine'
import { itemDefinitions, itemNameMap } from '@/game/data'
import { STORY_EVENTS, markEventTriggered, isEventTriggered } from '@/game/storyEvents'
import {
  createBattleState, deployCrew, getDeployedCrew,
  simulateFullBattle, generateRandomEncounter,
  isShipDestroyed,
  type BattleState as BattleData, type BattleSide, type BattleLogEntry,
} from '@/game/battle'
import { useGameStore } from '@/store/gameStore'
import SettingsPanel from '@/components/SettingsPanel'
import type { BuildingType, GameSession, QuestState } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

type MainView = 'town' | 'airship' | 'map'
type DialogMode = 'plain' | 'inline-image' | 'portrait-left' | 'portrait-right'
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
  const [settingsTab, setSettingsTab] = useState<'options' | 'saves'>('options')
  const [isExecutingPlan, setIsExecutingPlan] = useState(false)
  const [battleData, setBattleData] = useState<BattleData | null>(null)
  const [isDrillBattle, setIsDrillBattle] = useState(true) // true=演习, false=遭遇战
const [dialogConfig, setDialogConfig] = useState<{
    mode?: DialogMode
    title: string
    content: string
    imageUrl?: string
    portraitUrl?: string
    characterName?: string
    buttons: { label: string; onClick: () => void }[]
  } | null>(null)
  const selectNode = useGameStore((state) => state.selectNode)
  const tavernRumor = useGameStore((state) => state.tavernRumor)
  const buyProduct = useGameStore((state) => state.buyProduct)
  const sellCargo = useGameStore((state) => state.sellCargo)
  const scheduleTravel = useGameStore((state) => state.scheduleTravel)
  const establishBranch = useGameStore((state) => state.establishBranch)
  const donateToCity = useGameStore((state) => state.donateToCity)
  const createTradeLinkBetween = useGameStore((state) => state.createTradeLinkBetween)
  const removeTradeLink = useGameStore((state) => state.removeTradeLink)
  const increaseRetainerCapacity = useGameStore((state) => state.increaseRetainerCapacity)
  const increaseCargoCapacity = useGameStore((state) => state.increaseCargoCapacity)
  const increaseMoveRange = useGameStore((state) => state.increaseMoveRange)
  const buildBuilding = useGameStore((state) => state.buildBuilding)
  const createTradeLink = useGameStore((state) => state.createTradeLink)
  const clearPendingPlan = useGameStore((state) => state.clearPendingPlan)
  const executePendingPlan = useGameStore((state) => state.executePendingPlan)
  const acceptQuest = useGameStore((state) => state.acceptQuest)
  const completeQuest = useGameStore((state) => state.completeQuest)
  const saveCurrent = useGameStore((state) => state.saveCurrent)

  useEffect(() => {
    refreshSaves()
  }, [refreshSaves])

  // ── 初始引导：3 步连续对话框 ──
  useEffect(() => {
    if (!session) return
    if (isEventTriggered(session, STORY_EVENTS.INTRO_DIALOG)) return
    markEventTriggered(session, STORY_EVENTS.INTRO_DIALOG)
    showIntroStep(0)

    function showIntroStep(step: number) {
      const steps: { title: string; content: string }[] = [
        {
          title: '开拓许可',
          content:
            '你手中的灵材与灵石，是起点，也是唯一可用的本钱。\n\n天灾后的碎片疆域上，商会如野草般生灭。你领到的开拓许可期限有限，在那之前，是建起横跨诸地的商路、让商会名号传遍七十二城，还是灰溜溜地在期限到来前清账离场——全看你自己。\n\n飞舟已泊在码头，地图上尚有大片迷雾。第一步怎么走，你来定。',
        },
        {
          title: '城镇一览',
          content:
            '你所在的据点是一座城镇——这里是你的行动枢纽。\n\n• 酒馆（知客亭/营地）：可以打听新据点和道路传闻，也能接取或交付委托。\n• 交易所：买卖本地特产，低买高卖赚取差价。\n• 城主府（分号所在地）：已设立分号的城镇可在此开设商会，管理商路与产业。\n\n先去酒馆或交易所看看，熟悉一下环境吧。',
        },
        {
          title: '启程资金',
          content:
            '商会账上虽有些底子，但跑商周转总归需要更多灵石。会长助理特批了一笔额外资金，已划入商会账册。\n\n省着点花——飞舟维护、供奉酬劳、货物押金，处处都要灵石。',
        },
      ]
      if (step >= steps.length) {
        setDialogConfig(null)
        return
      }
      setDialogConfig({
        mode: 'portrait-right',
        portraitUrl: characterPortraitUrl,
        characterName: '会长助理',
        title: steps[step].title,
        content: steps[step].content,
        buttons:
          step === 2
            ? [
                {
                  label: '收下灵石（+200）',
                  onClick: () => {
                    session.player.spiritStone += 200
                    setDialogConfig(null)
                  },
                },
              ]
            : [{ label: '继续', onClick: () => showIntroStep(step + 1) }],
      })
    }
  }, [session])

  // ── 飞舟首次进入引导 ──
  useEffect(() => {
    if (!session || mainView !== 'airship') return
    if (isEventTriggered(session, STORY_EVENTS.AIRSHIP_INTRO)) return
    markEventTriggered(session, STORY_EVENTS.AIRSHIP_INTRO)
    setDialogConfig({
        mode: 'portrait-right',
        portraitUrl: characterPortraitUrl,
        characterName: '会长助理',
        title: '飞舟总览',
      content:
        '飞舟是你的移动总部，可在此查看商会资产。\n\n• 行囊：查看随身携带的货物与道具。\n• 改造：消耗灵石升级飞舟的货仓容量、移动范围和供奉席位。\n\n定期升级飞舟，才能把商路铺得更远。',
      buttons: [{ label: '知道了', onClick: () => setDialogConfig(null) }],
    })
  }, [mainView, session])

  // ── 地图首次进入引导（2 步） ──
  useEffect(() => {
    if (!session || mainView !== 'map') return
    if (isEventTriggered(session, STORY_EVENTS.MAP_INTRO)) return
    markEventTriggered(session, STORY_EVENTS.MAP_INTRO)
    showMapIntroStep(0)

    function showMapIntroStep(step: number) {
      const steps: { title: string; content: string }[] = [
        {
          title: '大地图指南',
          content:
            '在这片碎片疆域上，移动与探索是扩张商路的基础。\n\n• 移动：选中已确认道路的据点，消耗移动力前往。高移动力仅在已确认道路上生效。\n• 探索：选中仅知传闻的据点或道路，执行"探索"指令可将其确认为可用路线——每次探索固定消耗一回合。\n• 打听传闻：据点内的酒馆（知客亭/营地）可以打听新据点和新道路的消息。\n• 过回合：结束当前回合，推进商会运作、结算收入与供奉任务。\n\n先确认周边的道路和据点，摸清这片区域的底细。',
        },
        {
          title: '商路与收入',
          content:
            '商路是商会收入的核心来源。\n\n• 在据点间建立商路，需要占用一名供奉常驻维护。\n• 商路会将对端据点全部本地产物带入收入计算，但不进入交易所流通。\n• 城镇据点可通过提升繁荣度来加成该商路收入。\n• 注意：商路不增加交易品种类，仅增加灵石收入。\n\n供奉有限，商路需要精挑细选——连接高产出据点才是最划算的买卖。',
        },
      ]
      if (step >= steps.length) {
        setDialogConfig(null)
        return
      }
      setDialogConfig({
        mode: 'portrait-right',
        portraitUrl: characterPortraitUrl,
        characterName: '会长助理',
        title: steps[step].title,
        content: steps[step].content,
        buttons: [
          { label: step < steps.length - 1 ? '继续' : '出发', onClick: () => showMapIntroStep(step + 1) },
        ],
      })
    }
  }, [mainView, session])

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

  function showQuestAcceptDialog(quest: QuestState) {
    setDialogConfig({
      title: quest.title,
      content: quest.intro,
      buttons: [
        {
          label: `接下委托（报酬 ${quest.type === 'purchase' ? '优于市价' : quest.type === 'deliver' ? '灵石报酬' : '灵石结算'}）`,
          onClick: () => {
            acceptQuest(quest.id)
            setDialogConfig(null)
          },
        },
        { label: '再考虑考虑', onClick: () => setDialogConfig(null) },
      ],
    })
  }

  function showQuestCompleteDialog(quest: QuestState) {
    setDialogConfig({
      title: `交付 · ${quest.title}`,
      content: quest.completePrompt,
      buttons: [
        {
          label: '交付任务',
          onClick: () => {
            completeQuest(quest.id)
            setDialogConfig(null)
          },
        },
        { label: '稍后再说', onClick: () => setDialogConfig(null) },
      ],
    })
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
    const hadTravel = pendingPlan?.type === 'travel'
    await new Promise((resolve) => window.setTimeout(resolve, 320))
    executePendingPlan()
    await new Promise((resolve) => window.setTimeout(resolve, 620))
    setIsExecutingPlan(false)

    // 过回合后结算完成，如有移动则随机触发遭遇战
    if (hadTravel && Math.random() < 0.5) {
      const encounter = generateRandomEncounter(session.player.airshipDurability)
      setBattleData(encounter)
      setIsDrillBattle(false)
    }
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
              onOpenSettings={() => { setSettingsOpen(true); setSettingsTab('options') }}
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
                <AirshipStage
                  session={session}
                  onIncreaseRetainerCapacity={increaseRetainerCapacity}
                  onIncreaseCargoCapacity={increaseCargoCapacity}
                  onIncreaseMoveRange={increaseMoveRange}
                  onStartDrill={() => setBattleData(createBattleState(session.player.airshipDurability))}
                />
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
                  onAcceptQuest={(quest) => showQuestAcceptDialog(quest)}
                  onCompleteQuest={(quest) => showQuestCompleteDialog(quest)}
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
            <OverlayFrame title={settingsTab === 'options' ? '选项' : '存档管理'} onClose={() => setSettingsOpen(false)}>
              {settingsTab === 'options' ? (
                <SettingsWindowTabOptions />
              ) : (
                <SettingsWindowTabSaves
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
              )}
              <div className="mt-4 flex justify-center gap-3">
                <button
                  className={`rounded-[12px] border px-4 py-2 text-sm transition ${settingsTab === 'options' ? 'border-[#c19154]/65 bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))] text-[#fff4dd]' : 'border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] text-[#ead8ba] hover:border-[#c19154]/65 hover:text-[#fff4dd]'}`}
                  onClick={() => setSettingsTab('options')}
                >
                  选项
                </button>
                <button
                  className={`rounded-[12px] border px-4 py-2 text-sm transition ${settingsTab === 'saves' ? 'border-[#c19154]/65 bg-[linear-gradient(180deg,rgba(110,74,43,0.96),rgba(68,45,28,0.94))] text-[#fff4dd]' : 'border-[#7c5c39]/50 bg-[linear-gradient(180deg,rgba(72,48,30,0.94),rgba(45,30,21,0.92))] text-[#ead8ba] hover:border-[#c19154]/65 hover:text-[#fff4dd]'}`}
                  onClick={() => setSettingsTab('saves')}
                >
                  存档管理
                </button>
              </div>
            </OverlayFrame>
          ) : null}

          {dialogConfig ? (
            <DialogWindow
              mode={dialogConfig.mode}
              title={dialogConfig.title}
              content={dialogConfig.content}
              imageUrl={dialogConfig.imageUrl}
              portraitUrl={dialogConfig.portraitUrl}
              characterName={dialogConfig.characterName}
              buttons={dialogConfig.buttons}
            />
          ) : null}

          {battleData ? (
            <BattleModal
              battle={battleData}
              maxCrew={session.player.airshipCrew}
              isDrill={isDrillBattle}
              onClose={(settlement) => {
                if (settlement) {
                  session.player.airshipDurability = Math.max(0, session.player.airshipDurability - settlement.shipDamage)
                  session.player.airshipCrew = Math.max(0, session.player.airshipCrew - settlement.crewLoss)
                }
                setBattleData(null)
                setIsDrillBattle(true)
              }}
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

// ─── 战斗系统 ────────────────────────────────────────────

const ROW_LABELS = ['後', '中', '前']
const COL_LABELS = ['上', '中', '下']

function getCellLabel(index: number): string {
  return `${ROW_LABELS[Math.floor(index / 3)]}${COL_LABELS[index % 3]}`
}

function cellColor(hp: number, maxHp: number, type: string): string {
  if (type === 'empty') return ''
  const ratio = hp / maxHp
  if (ratio > 0.6) return 'text-emerald-300'
  if (ratio > 0.3) return 'text-amber-300'
  return 'text-red-400'
}

function hpBarColor(hp: number, maxHp: number): string {
  const ratio = hp / maxHp
  if (ratio > 0.6) return 'bg-emerald-500'
  if (ratio > 0.3) return 'bg-amber-500'
  return 'bg-red-500'
}

function BattleGrid({
  side,
  label,
  isPlayer,
  onCellClick,
  onCellReduce,
  highlightAtk,
  highlightDef,
  facing,
  visualHp,
}: {
  side: BattleSide
  label: string
  isPlayer: boolean
  onCellClick?: (pos: number) => void
  onCellReduce?: (pos: number) => void
  highlightAtk?: number | null
  highlightDef?: number | null
  /** 'attacker': transpose; 'defender': transpose + reverse rows */
  facing?: 'attacker' | 'defender'
  /** 动画回放期独立 HP 显示层，不传则直接用 model 值 */
  visualHp?: number[]
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-100/50">{label}</p>
      {[0, 1, 2].map((visualRow) => (
        <div key={visualRow} className="flex gap-1">
          {[0, 1, 2].map((visualCol) => {
            const pos = !facing
              ? visualRow * 3 + visualCol // standard
              : facing === 'defender'
                ? 6 - 3 * visualCol + visualRow // transpose + reverse rows
                : 3 * visualCol + visualRow // transpose only
            const cell = side.cells[pos]
            const hp = visualHp ? visualHp[pos] : cell.currentHp
            const isAtk = highlightAtk === pos
            const isDef = highlightDef === pos
            return (
              <button
                key={pos}
                type="button"
                disabled={!isPlayer || cell.type === 'ship'}
                onClick={() => onCellClick?.(pos)}
                className={[
                  'relative flex h-[68px] w-[68px] flex-col items-center justify-center rounded-[12px] border text-xs transition',
                  cell.type === 'empty'
                    ? 'border-[#5a4030]/40 bg-[#2a1e14]/50 text-[#6f5539]'
                    : cell.type === 'ship'
                      ? 'border-[#c19154]/60 bg-[linear-gradient(180deg,rgba(99,65,38,0.95),rgba(61,40,25,0.9))] text-[#fff4dd]'
                      : 'border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(67,45,28,0.92),rgba(41,28,19,0.9))] text-[#ead8ba] hover:border-[#c19154]/50',
                  isDef ? 'cell-defender' : '',
                  isAtk ? 'cell-attacker' : '',
                ].join(' ')}
              >
                {cell.type === 'empty' ? (
                  <span className="text-[10px] opacity-40">{getCellLabel(pos)}</span>
                ) : (
                  <>
                    <span className="text-[10px] leading-tight opacity-60">
                      {cell.type === 'ship' ? '飞舟' : getCellLabel(pos)}
                    </span>
                    <span className={`text-sm font-bold ${cellColor(hp, cell.maxHp, cell.type)}`}>
                      {hp}
                    </span>
                    {/* Deploy phase: +/- buttons replace HP bar on crew cells */}
                    {cell.type === 'crew' && onCellReduce ? (
                      <div className="mt-0.5 flex items-center gap-3">
                        <span
                          className="cursor-pointer text-xs leading-none text-red-400/70 hover:text-red-300 select-none"
                          onClick={(e) => { e.stopPropagation(); onCellReduce(pos) }}
                        >−</span>
                        <span
                          className="cursor-pointer text-xs leading-none text-emerald-400/70 hover:text-emerald-300 select-none"
                          onClick={(e) => { e.stopPropagation(); onCellClick?.(pos) }}
                        >+</span>
                      </div>
                    ) : cell.type === 'crew' ? (
                      /* HP bar (fighting/result phase) */
                      <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-[#1a110a]/60">
                        <div
                          className={`h-full rounded-full ${hpBarColor(hp, cell.maxHp)}`}
                          style={{ width: `${(hp / cell.maxHp) * 100}%` }}
                        />
                      </div>
                    ) : null}
                  </>
                )}
                {/* Projectile indicator for attacker */}
                {isAtk ? <span className="projectile-marker">✦</span> : null}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function BattleModal({
  battle: initialBattle,
  maxCrew,
  isDrill = true,
  onClose,
}: {
  battle: BattleData
  maxCrew: number
  isDrill?: boolean
  onClose: (settlement?: { shipDamage: number; crewLoss: number }) => void
}) {
  const [data, setData] = useState(initialBattle)
  const [attackHighlight, setAttackHighlight] = useState<{
    fromPos: number
    toPos: number
    side: 'player' | 'enemy'
  } | null>(null)
  // 动画回放状态
  const [animIndex, setAnimIndex] = useState(-1)           // -1 = 未回放
  const [visualPlayerHp, setVisualPlayerHp] = useState<number[]>([])
  const [visualEnemyHp, setVisualEnemyHp] = useState<number[]>([])
  const animLogsRef = useRef<BattleLogEntry[]>([])
  const animFinalRef = useRef<{
    playerSide: BattleSide
    enemySide: BattleSide
    result: 'none' | 'player_victory' | 'enemy_victory'
  } | null>(null)
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const dataRef = useRef(data)
  dataRef.current = data

  // ── 战斗回放系统 ──
  // 预计算全部轮次，动画只做回放，HP 显示与 model 解耦

  /** 步进播放下一个动画事件 */
  useEffect(() => {
    if (animIndex < 0) return         // 未开始
    if (animIndex >= animLogsRef.current.length) return  // 已播完

    let cancelled = false
    const log = animLogsRef.current[animIndex]

    // 同时触发：高亮 + HP 变化，让玩家感觉是这一击打掉了血
    setAttackHighlight({ fromPos: log.fromPos, toPos: log.toPos, side: log.side })
    if (log.side === 'player') {
      setVisualEnemyHp(prev => {
        const next = [...prev]
        next[log.toPos] = Math.max(0, next[log.toPos] - log.damage)
        return next
      })
    } else {
      setVisualPlayerHp(prev => {
        const next = [...prev]
        next[log.toPos] = Math.max(0, next[log.toPos] - log.damage)
        return next
      })
    }

    // 清除高亮
    const clearTimer = setTimeout(() => {
      if (!cancelled) setAttackHighlight(null)
    }, 400)

    // 高亮动画结束后停顿一下，再播放下一个事件
    pauseTimerRef.current = setTimeout(() => {
      if (cancelled) return

      const nextIndex = animIndex + 1
      if (nextIndex >= animLogsRef.current.length) {
        // 全部播完 → 应用最终结算到 model
        const f = animFinalRef.current
        if (f) {
          setData(prev => {
            prev.playerSide = f.playerSide
            prev.enemySide = f.enemySide
            prev.phase = 'result'
            prev.logs.push(...animLogsRef.current)
            prev.roundIndex = Math.ceil(animLogsRef.current.length / 18)
            return { ...prev }
          })
        }
        // 清理回放状态
        setAnimIndex(-1)
        setVisualPlayerHp([])
        setVisualEnemyHp([])
      } else {
        setAnimIndex(nextIndex)
      }
    }, 700) // 400ms 动画 + 300ms 停顿

    return () => {
      cancelled = true
      clearTimeout(clearTimer)
      clearTimeout(pauseTimerRef.current)
    }
  }, [animIndex])

  const handleDeployAdd = (pos: number) => {
    if (data.phase !== 'deploy') return
    const cell = data.playerSide.cells[pos]
    if (cell.type === 'ship') return
    const remaining = maxCrew - getDeployedCrew(data)
    if (remaining <= 0) return
    const amount = Math.min(10, remaining)
    const newAmount = (cell.type === 'crew' ? cell.currentHp : 0) + amount
    deployCrew(data, pos, newAmount)
    setData({ ...data })
  }

  const handleDeployReduce = (pos: number) => {
    if (data.phase !== 'deploy') return
    const cell = data.playerSide.cells[pos]
    if (cell.type !== 'crew') return
    if (cell.currentHp <= 10) {
      deployCrew(data, pos, 0)
    } else {
      deployCrew(data, pos, cell.currentHp - 10)
    }
    setData({ ...data })
  }

  const startFight = (skipAnim = false) => {
    const deployed = getDeployedCrew(data)
    if (deployed === 0) return

    // 预计算整场战斗
    const sim = simulateFullBattle(data.playerSide, data.enemySide, data.whoStarts)

    // 保存最终结算信息
    animLogsRef.current = sim.allLogs
    animFinalRef.current = {
      playerSide: sim.finalPlayerSide,
      enemySide: sim.finalEnemySide,
      result: sim.result,
    }

    // 设置视觉 HP 为初始值
    setVisualPlayerHp(data.playerSide.cells.map(c => c.currentHp))
    setVisualEnemyHp(data.enemySide.cells.map(c => c.currentHp))

    data.phase = 'fighting'
    data.playerInitialCrew = deployed
    setData({ ...data })

    if (skipAnim) {
      // 跳过动画，直接跳转到结算
      const f = animFinalRef.current!
      setData(prev => {
        prev.playerSide = f.playerSide
        prev.enemySide = f.enemySide
        prev.phase = 'result'
        prev.logs.push(...animLogsRef.current)
        prev.roundIndex = Math.ceil(animLogsRef.current.length / 18)
        return { ...prev }
      })
      setAnimIndex(-1)
      setVisualPlayerHp([])
      setVisualEnemyHp([])
    } else {
      setAnimIndex(0)
    }
  }

  const autoDeployAll = () => {
    const total = maxCrew
    const positions = [0, 1, 2, 3, 5, 6, 7, 8]
    const perCell = Math.floor(total / positions.length)
    let extra = total % positions.length
    positions.forEach((pos) => {
      const amount = perCell + (extra > 0 ? 1 : 0)
      if (extra > 0) extra--
      deployCrew(data, pos, amount)
    })
    setData({ ...data })
  }

  // Compute highlight positions for each grid
  const playerAtk = attackHighlight?.side === 'player' ? attackHighlight.fromPos : null
  const playerDef = attackHighlight?.side === 'enemy' ? attackHighlight.toPos : null
  const enemyAtk = attackHighlight?.side === 'enemy' ? attackHighlight.fromPos : null
  const enemyDef = attackHighlight?.side === 'player' ? attackHighlight.toPos : null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      <div className="relative flex h-[82%] w-[86%] flex-col overflow-hidden rounded-[22px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-6 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
        {/* Battle animation keyframes */}
        <style>{`
          @keyframes attack-pulse {
            0%, 100% { box-shadow: 0 0 8px rgba(251,191,36,0.5); }
            50% { box-shadow: 0 0 20px rgba(251,191,36,0.85), 0 0 40px rgba(251,191,36,0.35); }
          }
          @keyframes hit-flash {
            0%, 100% { box-shadow: 0 0 6px rgba(239,68,68,0.5); }
            50% { box-shadow: 0 0 18px rgba(239,68,68,0.85), 0 0 36px rgba(239,68,68,0.35); }
          }
          @keyframes projectile-fly {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            50% { opacity: 1; transform: translateY(-8px) scale(1.3); }
            100% { opacity: 0; transform: translateY(-16px) scale(0.7); }
          }
          .cell-attacker {
            animation: attack-pulse 0.4s ease-in-out !important;
          }
          .cell-defender {
            animation: hit-flash 0.4s ease-in-out !important;
          }
          .projectile-marker {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 16px;
            color: #fbbf24;
            filter: drop-shadow(0 0 4px rgba(251,191,36,0.8));
            animation: projectile-fly 0.4s ease-out forwards;
            pointer-events: none;
          }
        `}</style>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{isDrill ? '演习模式' : '遭遇战'}</p>
            <h2 className="font-serif text-2xl text-[#fff4dd]">
              {data.phase === 'deploy' && (isDrill ? '部署阵型' : '部署阵型 · 遭遇战')}
              {data.phase === 'fighting' && '战斗中'}
              {data.phase === 'result' && (isDrill ? '演习结束' : '战斗结束')}
            </h2>
          </div>
          {data.phase !== 'fighting' && data.phase !== 'result' ? (
            <button className="action" onClick={() => onClose()}>
              关闭
            </button>
          ) : null}
        </div>
        {/* Main area: two grids face to face */}
        <div className="flex items-start justify-center gap-64">
          <BattleGrid
            side={data.enemySide}
            label="攻击方"
            isPlayer={false}
            facing="attacker"
            highlightAtk={enemyAtk}
            highlightDef={enemyDef}
            visualHp={data.phase === 'fighting' ? visualEnemyHp : undefined}
          />
          <BattleGrid
            side={data.playerSide}
            label="防守方"
            isPlayer={true}
            facing="defender"
            highlightAtk={playerAtk}
            highlightDef={playerDef}
            visualHp={data.phase === 'fighting' ? visualPlayerHp : undefined}
            onCellClick={handleDeployAdd}
            onCellReduce={data.phase === 'deploy' ? handleDeployReduce : undefined}
          />
        </div>
        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-between">
          {/* Left: status info */}
          <div className="flex items-center gap-4 text-sm text-[#ead8ba]">
            {data.phase === 'deploy' ? (
              <>
                <span>
                  可部署: <strong className="text-[#fff4dd]">{maxCrew - getDeployedCrew(data)}</strong> / {maxCrew}
                </span>
                <span className="text-[#7a5a36]">|</span>
                <span className="text-xs text-amber-100/40">点击空白格部署(×10)，已部署格可用 [+]/[−] 调整</span>
              </>
            ) : data.phase === 'fighting' ? (
              <>
                <span>
                  回合: <strong className="text-[#fff4dd]">{data.roundIndex}</strong>
                </span>
              </>
            ) : (
              <>
                <span>
                  日志: <strong className="text-[#fff4dd]">{data.logs.length}</strong> 条行动
                </span>
              </>
            )}
          </div>
          {/* Right: action button */}
          {data.phase === 'deploy' ? (
            <div className="flex gap-2">
              <button className="action" disabled={getDeployedCrew(data) === 0} onClick={() => startFight()}>
                开始战斗
              </button>
              <button className="action" disabled={getDeployedCrew(data) === 0} onClick={() => startFight(true)}>
                快速战斗
              </button>
              <button className="action" onClick={autoDeployAll}>
                自动部署
              </button>
            </div>
          ) : null}
          {data.phase === 'fighting' ? (
            <div className="flex gap-2">
              <button className="action" onClick={() => {
                // 跳过战斗：停止动画，直接结算
                clearTimeout(pauseTimerRef.current)
                const f = animFinalRef.current
                if (f) {
                  setData(prev => {
                    prev.playerSide = f.playerSide
                    prev.enemySide = f.enemySide
                    prev.phase = 'result'
                    prev.logs.push(...animLogsRef.current)
                    prev.roundIndex = Math.ceil(animLogsRef.current.length / 18)
                    return { ...prev }
                  })
                }
                setAnimIndex(-1)
                setAttackHighlight(null)
                setVisualPlayerHp([])
                setVisualEnemyHp([])
              }}>
                跳过战斗
              </button>
            </div>
          ) : null}
          {data.phase === 'result' && data.playerSide ? (
            <div className="flex gap-3">
              <button className="action" onClick={() => {
                if (!isDrill) {
                  const shipDamage = data.shipInitialDurability - data.playerSide.cells[4].currentHp
                  const crewLoss = data.playerInitialCrew - getDeployedCrew(data)
                  onClose({ shipDamage, crewLoss })
                } else {
                  onClose()
                }
              }}>
                结算完成
              </button>
            </div>
          ) : null}
        </div>
        {/* Result detail */}
        {data.phase === 'result' ? (
          <div className="mt-4 rounded-[16px] border border-[#7a5a36]/40 bg-[#2a1e14]/60 p-5 text-sm text-[#ead8ba]">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-amber-100/40">战果统计</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">飞舟耐久损失</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">
                  {data.shipInitialDurability - data.playerSide.cells[4].currentHp} / {data.shipInitialDurability}
                </p>
              </div>
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">船员损失</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">
                  {data.playerInitialCrew - getDeployedCrew(data) > 0
                    ? data.playerInitialCrew - getDeployedCrew(data)
                    : 0} / {data.playerInitialCrew}
                </p>
              </div>
              <div className="rounded-[12px] border border-[#7a5a36]/35 bg-[#1a110a]/50 p-3 text-center">
                <p className="text-xs text-amber-100/50">战斗结论</p>
                <p className="mt-1 text-lg font-bold text-[#fff4dd]">
                {isShipDestroyed(data.playerSide) ? '失败' : '胜利'}
              </p>
              </div>
            </div>
            {/* Action log */}
            <div className="mt-4 max-h-[120px] overflow-y-auto rounded-[12px] border border-[#7a5a36]/25 bg-[#1a110a]/60 p-3 text-xs leading-6">
              {data.logs.length === 0 ? (
                <p className="text-amber-100/30">无战斗记录</p>
              ) : (
                data.logs.map((log, i) => (
                  <p key={i} className={log.side === 'player' ? 'text-emerald-300/80' : 'text-red-300/80'}>
                    [{log.side === 'player' ? '己方' : '敌方'}] {getCellLabel(log.fromPos)} → {getCellLabel(log.toPos)}，
                    造成 {log.damage} 伤害{log.killed ? ' 💀' : ''}
                  </p>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
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

function AirshipStage({
  session,
  onIncreaseRetainerCapacity,
  onIncreaseCargoCapacity,
  onIncreaseMoveRange,
  onStartDrill,
}: {
  session: GameSession
  onIncreaseRetainerCapacity: () => void
  onIncreaseCargoCapacity: () => void
  onIncreaseMoveRange: () => void
  onStartDrill: () => void
}) {
  const retainerCost = session.config.economy.retainerUpgradeBaseCost * (session.player.retainerCapacity - 1)
  const cargoCost = session.config.economy.cargoUpgradeBaseCost * (session.player.cargoCapacity - 1)
  const moveRangeCost = session.config.economy.moveRangeUpgradeBaseCost * session.player.moveRange
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

      {/* Left column */}
      <div className="absolute left-5 top-5 flex w-72 flex-col gap-4" style={{ maxHeight: 'calc(100% - 40px)' }}>
        {/* 飞舟改造状态 + 入口 */}
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
          <button className="action mt-3 w-full" onClick={() => setShowModifications(true)}>
            进入改造舱
          </button>
        </FloatingPanel>

        {/* 船长室入口 */}
        <FloatingPanel title="船长室" subtitle="行囊与任务">
          <p className="text-sm leading-6 text-[#ead8ba]">
            查看随身物品，追踪当前委托进展。
          </p>
          <button className="action mt-3 w-full" onClick={() => setShowCaptainCabin(true)}>
            进入船长室
          </button>
        </FloatingPanel>

        {/* 演习入口 */}
        <FloatingPanel title="演习" subtitle="模拟战">
          <p className="text-sm leading-6 text-[#ead8ba]">
            不消耗资源的模拟战斗，用于测试阵型搭配。
          </p>
          <button className="action mt-3 w-full" onClick={onStartDrill}>
            开始演习
          </button>
        </FloatingPanel>
      </div>

      {/* 改造飞船子界面 */}
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

      {/* 船长室子界面 */}
      {showCaptainCabin ? (
        <OverlayFrame title="船长室 · 行囊与任务" onClose={() => setShowCaptainCabin(false)}>
          <div className="grid h-full grid-cols-2 gap-6">
            {/* 物品栏 */}
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

            {/* 任务追踪 */}
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
                      const node = session.world.nodes.find((n) => n.id === quest.nodeId)
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
  mode,
  imageUrl,
  portraitUrl,
  characterName,
  buttons,
}: {
  mode?: DialogMode
  title: string
  content: string
  imageUrl?: string
  portraitUrl?: string
  characterName?: string
  buttons: { label: string; onClick: () => void }[]
}) {
  const withPortrait = mode === 'portrait-left' || mode === 'portrait-right'
  const isLeft = mode === 'portrait-left'

  return (
    <div className="absolute inset-0 z-20 flex justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      {/* Non-portrait: center vertically */}
      {!withPortrait ? (
        <div className="flex items-center">
          <div className="relative w-[480px] max-w-[86%] overflow-hidden rounded-[20px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-6 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,229,177,0.42),transparent)]" />
            <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">消息</p>
            <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
            {mode === 'inline-image' && imageUrl ? (
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
      ) : (
        /* Portrait: top-anchored so dialog expands downward without shifting the portrait */
        <div className="relative mt-[40vh]">
          {/* Half-body portrait — bottom edge touches top of dialog box */}
          {portraitUrl ? (
            <div className={`absolute bottom-full z-30 ${isLeft ? 'left-10' : 'right-16'}`}>
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <img src={portraitUrl} alt={characterName ?? ''} className="h-[260px] w-auto select-none" draggable={false} />
                  {characterName ? (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-[10px] border border-[#7a5a36]/50 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] px-3 py-1 text-xs text-[#cdb48a] whitespace-nowrap">
                      {characterName}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex w-[880px] max-w-[86%] flex-col overflow-hidden rounded-[20px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,229,177,0.42),transparent)]" />
            {/* Scrollable content area */}
            <div className="max-h-[55vh] overflow-y-auto p-6">
               <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">消息</p>
               <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
               <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#ead8ba]">{content}</p>
            </div>
            {/* Fixed button area — always visible */}
            <div className="flex-shrink-0 border-t border-[#7a5a36]/30 px-6 py-4">
              <div className="flex flex-wrap gap-3">
                {buttons.map((button, index) => (
                  <button key={index} className="action" onClick={button.onClick}>
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
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
  onAcceptQuest,
  onCompleteQuest,
}: {
  session: GameSession
  nodeId: string
  venue: ReturnType<typeof getRumorVenueCopy>
  onTavernRumor: () => void
  onAcceptQuest: (quest: QuestState) => void
  onCompleteQuest: (quest: QuestState) => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const isLocal = targetNode.id === currentNode.id

  // Generate quests on mount
  useEffect(() => {
    if (isLocal) {
      generateNodeQuests(session, nodeId)
    }
    // Only run once per session/opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableQuests = isLocal ? getNodeQuests(session, nodeId).filter((q) => q.status === 'available') : []
  const completableQuests = getCompletableQuests(session, nodeId)

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

  const hasAnyQuests = availableQuests.length > 0 || completableQuests.length > 0

  return (
    <div className="grid h-full grid-cols-[0.9fr_1.1fr] gap-4">
      <div className="flex flex-col gap-4 overflow-hidden">
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

        {/* Quests Section */}
        {hasAnyQuests ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">委托</p>
            <div className="mt-4 grid gap-3">
              {availableQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#fff4dd]">{quest.title}</p>
                      <p className="mt-1 text-xs text-[#cdb48a]">委托人：{quest.npcName}</p>
                    </div>
                    <button className="action !px-3 !py-2" onClick={() => onAcceptQuest(quest)}>
                      接取
                    </button>
                  </div>
                </div>
              ))}
              {completableQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="rounded-[14px] border border-[#d4a853]/50 bg-[linear-gradient(180deg,rgba(86,68,35,0.92),rgba(55,44,24,0.9))] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#fff4dd]">{quest.title}</p>
                      <p className="mt-1 text-xs text-[#cdb48a]">可交付 · 委托人：{quest.npcName}</p>
                    </div>
                    <button className="action !px-3 !py-2" onClick={() => onCompleteQuest(quest)}>
                      交付
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
                  <button className="action !px-3 !py-2" data-sfx="trade" onClick={() => onBuyProduct(productId)} disabled={!isLocal}>
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
                  data-sfx="trade"
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

function SettingsWindowTabOptions() {
  return (
    <div className="mx-auto max-w-md">
      <SettingsPanel />
    </div>
  )
}

function SettingsWindowTabSaves({
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
