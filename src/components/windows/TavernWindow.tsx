import { useEffect, useRef, useState } from 'react'
import { getCurrentNode, generateNodeQuests, getNodeQuests, getCompletableQuests } from '@/game/engine'
import { StatChip } from '@/components/ui'
import type { GameSession, QuestState } from '@/game/types'

export function TavernWindow({
  session,
  nodeId,
  venue,
  onTavernRumor,
  onAcceptQuest,
  onCompleteQuest,
  onRecruitCrew,
}: {
  session: GameSession
  nodeId: string
  venue: { name: string; hallLabel: string; actionLabel: string; entrySubtitle: string; intro: string; detail: string; emptyLine: string }
  onTavernRumor: () => void
  onAcceptQuest: (quest: QuestState) => void
  onCompleteQuest: (quest: QuestState) => void
  onRecruitCrew: () => void
}) {
  const currentNode = getCurrentNode(session)
  const targetNode = session.world.nodes.find((node) => node.id === nodeId) ?? currentNode
  const isLocal = targetNode.id === currentNode.id

  useEffect(() => {
    if (isLocal) {
      generateNodeQuests(session, nodeId)
    }
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
  const recruitCost = session.config.economy.recruitCrewCost
  const canRecruit = targetNode.type === 'town' && isLocal

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
          {canRecruit ? (
            <button
              className="action mt-3"
              disabled={session.player.spiritStone < recruitCost || session.player.airshipCrew >= session.player.airshipMaxCrew}
              onClick={onRecruitCrew}
            >
              招募船员（{recruitCost} 灵石/10人）
            </button>
          ) : null}
        </div>

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
                      <p className="mt-1 text-xs text-[#cdb48a]">
                        委托人：{quest.npcName}
                        {quest.minReputation ? <span className="ml-2 text-[#b88b54]">· 需要声望 {quest.minReputation}</span> : null}
                      </p>
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
