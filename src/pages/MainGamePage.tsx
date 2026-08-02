import { useEffect, useMemo, useState } from 'react'
import TopBar from '@/components/TopBar'
import {
  describePendingPlan,
  getCurrentNode,
  getSelectedNode,
  getPendingPlan,
} from '@/game/engine'
import { checkEvents, advanceEvent, tryStartEvent, buildDialogConfig } from '@/game/eventEngine'
import {
  createBattleState, generateRandomEncounter,
  type BattleState as BattleData,
} from '@/game/battle'
import { useGameStore } from '@/store/gameStore'
import SettingsPanel from '@/components/SettingsPanel'
import type { QuestState } from '@/game/types'

import { getRumorVenueCopy } from '@/components/stages/TownStage'
import { TownStage } from '@/components/stages/TownStage'
import { AirshipStage } from '@/components/stages/AirshipStage'
import { MapStage } from '@/components/stages/MapStage'
import { BattleModal } from '@/components/BattleModal'
import { OverlayFrame, Score, TurnAdvanceOverlay } from '@/components/ui'
import { TavernWindow } from '@/components/windows/TavernWindow'
import { MarketWindow } from '@/components/windows/MarketWindow'
import { BranchWindow, ManorWindow } from '@/components/windows/BranchWindow'
import { DialogWindow } from '@/components/windows/DialogWindow'
import { SectVisitWindow } from '@/components/windows/SectVisitWindow'
import { RuinExplorationWindow } from '@/components/windows/RuinExplorationWindow'

type MainView = 'town' | 'airship' | 'map'
type DialogMode = 'plain' | 'inline-image' | 'portrait-left' | 'portrait-right'
type OverlayWindowState =
  | {
      kind: 'rumor' | 'market' | 'branch' | 'manor' | 'sectVisit' | 'ruinExplore'
      nodeId: string
    }
  | null

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
  const [isDrillBattle, setIsDrillBattle] = useState(true)
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
  const repairAirship = useGameStore((state) => state.repairAirship)
  const recruitCrew = useGameStore((state) => state.recruitCrew)
  const repairCombatant = useGameStore((state) => state.repairCombatant)
  const buildBuilding = useGameStore((state) => state.buildBuilding)
  const clearPendingPlan = useGameStore((state) => state.clearPendingPlan)
  const executePendingPlan = useGameStore((state) => state.executePendingPlan)
  const acceptQuest = useGameStore((state) => state.acceptQuest)
  const completeQuest = useGameStore((state) => state.completeQuest)
  const buySectItem = useGameStore((state) => state.buySectItem)
  const startRuinAttempt = useGameStore((state) => state.startRuinAttempt)
  const advanceRuinToNode = useGameStore((state) => state.advanceRuinToNode)
  const resolveRuinWithItem = useGameStore((state) => state.resolveRuinWithItem)
  const resolveRuinForce = useGameStore((state) => state.resolveRuinForce)
  const resolveRuinRetreat = useGameStore((state) => state.resolveRuinRetreat)
  const saveCurrent = useGameStore((state) => state.saveCurrent)
  const loadSession = useGameStore((state) => state.loadSession)

  useEffect(() => {
    refreshSaves()
  }, [refreshSaves])

  // ── 初始引导：从事件系统驱动 ──
  function handleEventAdvance(choiceIndex?: number) {
    const currentSession = useGameStore.getState().session
    if (!currentSession) return
    const result = advanceEvent(currentSession, choiceIndex)
    loadSession(result.session)
    if (result.step) {
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    } else {
      setDialogConfig(null)
      // 事件结束后链式检查：init → arrive（支持多层事件串联）
      const updatedSession = useGameStore.getState().session!
      const initResult = checkEvents('init', updatedSession)
      if (initResult) {
        loadSession(initResult.session)
        setDialogConfig(buildDialogConfig(initResult.step, handleEventAdvance))
      } else {
        const arriveResult = checkEvents('arrive', updatedSession)
        if (arriveResult) {
          loadSession(arriveResult.session)
          setDialogConfig(buildDialogConfig(arriveResult.step, handleEventAdvance))
        }
      }
    }
  }

  useEffect(() => {
    if (!session) return
    const result = checkEvents('init', session)
    if (result) {
      loadSession(result.session)
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    }
  }, [session])

  useEffect(() => {
    if (!session || mainView !== 'airship') return
    const result = tryStartEvent('intro_airship', session)
    if (result) {
      loadSession(result.session)
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    }
  }, [mainView, session])

  useEffect(() => {
    if (!session || mainView !== 'map') return
    const result = tryStartEvent('intro_map', session)
    if (result) {
      loadSession(result.session)
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    }
  }, [mainView, session])

  useEffect(() => {
    if (!session || overlayWindow?.kind !== 'ruinExplore') return
    const result = tryStartEvent('intro_ruin', session)
    if (result) {
      loadSession(result.session)
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    }
  }, [overlayWindow, session])

  // ── 打开据点界面时检查 arrive 事件（返还遗物等） ──
  // 不依赖 session，仅在用户主动切换界面或打开 overlay 时触发
  useEffect(() => {
    const s = useGameStore.getState().session
    if (!s) return
    const isVisitingSect = overlayWindow?.kind === 'sectVisit'
    const isVisitingRuin = overlayWindow?.kind === 'ruinExplore'
    if (!isVisitingSect && !isVisitingRuin && mainView !== 'town') return

    const result = checkEvents('arrive', s)
    if (result) {
      loadSession(result.session)
      setDialogConfig(buildDialogConfig(result.step, handleEventAdvance))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainView, overlayWindow])

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
            // 委托完成后检查 quest_complete 触发事件
            const qcSession = useGameStore.getState().session
            if (qcSession) {
              const qcEvent = checkEvents('quest_complete', qcSession)
              if (qcEvent) {
                loadSession(qcEvent.session)
                setDialogConfig(buildDialogConfig(qcEvent.step, handleEventAdvance))
              }
            }
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

    // 旅行后检查 arrive 事件（保留为 fallback）
    if (hadTravel) {
      const currentSession = useGameStore.getState().session
      if (currentSession) {
        const eventResult = checkEvents('arrive', currentSession)
        if (eventResult) {
          loadSession(eventResult.session)
          setDialogConfig(buildDialogConfig(eventResult.step, handleEventAdvance))
          return // arrive 事件优先，跳过随机遭遇
        }
      }
    }

    // 每回合结束时检查 turn_end 事件
    const turnEndSession = useGameStore.getState().session
    if (turnEndSession) {
      const turnEndEvent = checkEvents('turn_end', turnEndSession)
      if (turnEndEvent) {
        loadSession(turnEndEvent.session)
        setDialogConfig(buildDialogConfig(turnEndEvent.step, handleEventAdvance))
      }
    }

    if (hadTravel && Math.random() < 0.5) {
      const encounter = generateRandomEncounter(session.player.airshipDurability, session.player.combatants)
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
                  onOpenSectVisit={() => openOverlay('sectVisit', currentNode.id)}
                  onOpenRuinExplore={() => openOverlay('ruinExplore', currentNode.id)}
                />
              ) : null}
              {mainView === 'airship' ? (
                <AirshipStage
                  session={session}
                  onIncreaseRetainerCapacity={increaseRetainerCapacity}
                  onIncreaseCargoCapacity={increaseCargoCapacity}
                  onIncreaseMoveRange={increaseMoveRange}
                  onRepairAirship={repairAirship}
                  onRepairCombatant={repairCombatant}
                  onStartDrill={() => setBattleData(createBattleState(session.player.airshipDurability, session.player.combatants))}
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
                      : overlayWindow.kind === 'manor'
                        ? `${overlayNode.name} · 城主府`
                        : overlayWindow.kind === 'sectVisit'
                          ? `${overlayNode.name} · 拜山`
                          : `${overlayNode.name} · 遗迹探索`
              }
              onClose={() => setOverlayWindow(null)}
            >
              {overlayWindow.kind === 'rumor' ? (
                <TavernWindow
                  session={session}
                  nodeId={overlayNode.id}
                  venue={getRumorVenueCopy(overlayNode.type)}
                  onTavernRumor={() => {
                    tavernRumor()
                    // 打听完后检查 action 事件（酒馆奇闻等）
                    const rumourSession = useGameStore.getState().session
                    if (rumourSession) {
                      const rumourEvent = checkEvents('action', rumourSession, { actionType: 'tavern_listen' })
                      if (rumourEvent) {
                        loadSession(rumourEvent.session)
                        setDialogConfig(buildDialogConfig(rumourEvent.step, handleEventAdvance))
                      }
                    }
                  }}
                  onAcceptQuest={(quest) => showQuestAcceptDialog(quest)}
                  onCompleteQuest={(quest) => showQuestCompleteDialog(quest)}
                  onRecruitCrew={recruitCrew}
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
              {overlayWindow.kind === 'sectVisit' ? (
                <SectVisitWindow
                  session={session}
                  onBuySectItem={buySectItem}
                />
              ) : null}
              {overlayWindow.kind === 'ruinExplore' ? (
                <RuinExplorationWindow
                  session={session}
                  onStartAttempt={startRuinAttempt}
                  onAdvanceNode={advanceRuinToNode}
                  onUseItem={resolveRuinWithItem}
                  onForceThrough={resolveRuinForce}
                  onRetreat={resolveRuinRetreat}
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
              isDrill={isDrillBattle}
              onClose={(settlement) => {
                const currentSession = useGameStore.getState().session
                if (!currentSession) return
                if (settlement) {
                  currentSession.player.airshipDurability = Math.max(0, currentSession.player.airshipDurability - settlement.shipDamage)
                  if (settlement.combatants) {
                    currentSession.player.combatants = settlement.combatants
                  }
                  if (battleData?.battleEventId && settlement.battleResult) {
                    const eventResult = checkEvents('battle_end', currentSession, { battleResult: settlement.battleResult })
                    if (eventResult) {
                      loadSession(eventResult.session)
                    }
                  }
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

// ── 设置窗口标签（内联小工具，不够通用不拆出） ──

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
