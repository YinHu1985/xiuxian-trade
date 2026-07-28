import { getCurrentNode, getRuinReachableNodes, getRuinPendingEncounter, getItemCount } from '@/game/engine'
import { obstacleLabelMap } from '@/game/data'
import { StatChip } from '@/components/ui'
import type { GameSession } from '@/game/types'

// ── 布局常数 ──
const NODE_W = 88
const NODE_H = 48
const LAYER_GAP = 120
const NODE_GAP = 72
const ENTRANCE_W = 72
const ENTRANCE_H = 48
const DEST_W = 72
const DEST_H = 48
const PAD = 20

export function RuinExplorationWindow({
  session,
  onStartAttempt,
  onAdvanceNode,
  onUseItem,
  onForceThrough,
  onRetreat,
}: {
  session: GameSession
  onStartAttempt: () => void
  onAdvanceNode: (nodeId: string) => void
  onUseItem: () => void
  onForceThrough: () => void
  onRetreat: () => void
}) {
  const currentNode = getCurrentNode(session)
  const ruin = currentNode.ruinExploration
  const pendingEncounter = getRuinPendingEncounter(session)
  const reachable = getRuinReachableNodes(session)

  // ── 错误状态 ──
  if (currentNode.type !== 'ruin') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-[14px] border border-dashed border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(72,48,30,0.84),rgba(46,31,21,0.8))] px-6 py-6 text-sm text-[#cdb48a]">
          当前不在遗迹据点。
        </div>
      </div>
    )
  }

  // ── 未生成地图 → 开始按钮 ──
  if (!ruin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">秘境入口</p>
          <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{currentNode.name}</h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#ead8ba]">
            残垣断壁之间隐约能感受到阵法的余韵。传闻此地深处藏有古修遗宝，
            需要穿越层层禁制才能抵达。
          </p>
          <button className="action mt-6" onClick={onStartAttempt}>
            开始探索
          </button>
        </div>
      </div>
    )
  }

  // ── 遭遇障碍对话框 ──
  if (pendingEncounter) {
    const neededItemName = pendingEncounter.neededItemName
    const hasItems = getItemCount(session, neededItemName) >= pendingEncounter.itemsNeeded

    return (
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">前方禁制</p>
          <h3 className="mt-3 font-serif text-2xl text-[#fff4dd]">{pendingEncounter.obstacleLabel}</h3>
          <p className="mt-4 text-sm leading-7 text-[#ead8ba]">
            一道{pendingEncounter.obstacleLabel}拦住了去路，威势不凡，需设法通过。
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatChip label="难度" value={pendingEncounter.difficulty} />
            <StatChip label="船员" value={`${session.player.airshipCrew}`} />
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <button
              className={`w-full rounded-[14px] border px-4 py-3 text-sm transition ${
                hasItems
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20'
                  : 'cursor-not-allowed border-slate-600/30 bg-slate-800/30 text-slate-500'
              }`}
              onClick={hasItems ? onUseItem : undefined}
              disabled={!hasItems}
            >
              {hasItems
                ? `使用 ${pendingEncounter.itemsNeeded} 枚${neededItemName}通过`
                : `${neededItemName}不足（需要 ${pendingEncounter.itemsNeeded} 枚）`}
            </button>
            <button
              className="w-full rounded-[14px] border border-red-400/50 bg-red-400/10 px-4 py-3 text-sm text-red-200 transition hover:bg-red-400/20"
              onClick={onForceThrough}
            >
              强行突破（损失约 {pendingEncounter.crewLoss} 名船员）
            </button>
            <button
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
              onClick={onRetreat}
            >
              返回入口
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 探索地图（含 SVG 连接线） ──

  const layers = getLayerNodes(ruin)
  const maxLayerSize = Math.max(...layers.map((l) => l.length), 1)
  const layerCount = layers.length

  // 计算画布尺寸
  const canvasW = PAD + ENTRANCE_W + LAYER_GAP + layerCount * (NODE_W + LAYER_GAP) + DEST_W + PAD
  const canvasH = PAD * 2 + maxLayerSize * (NODE_H + NODE_GAP) - NODE_GAP + NODE_H * 0.6

  // 计算各节点位置
  const nodePositions = new Map<string, { cx: number; cy: number }>()
  const entranceX = PAD
  const entranceCY = canvasH / 2
  layers.forEach((layerNodes, layerIdx) => {
    const layerX = PAD + ENTRANCE_W + LAYER_GAP + layerIdx * (NODE_W + LAYER_GAP)
    const totalH = layerNodes.length * (NODE_H + NODE_GAP) - NODE_GAP
    const startY = (canvasH - totalH) / 2
    layerNodes.forEach((node, posIdx) => {
      nodePositions.set(node.id, {
        cx: layerX,
        cy: startY + posIdx * (NODE_H + NODE_GAP),
      })
    })
  })
  const destX = PAD + ENTRANCE_W + LAYER_GAP + layerCount * (NODE_W + LAYER_GAP)
  const destCY = canvasH / 2

  return (
    <div className="flex h-full flex-col gap-4">
      {/* 标题栏 */}
      <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">遗迹秘境</p>
            <h3 className="mt-2 font-serif text-lg text-[#fff4dd]">{currentNode.name} · 密道</h3>
            <p className="mt-2 text-xs text-[#d8c2a0]">
              {ruin.completed
                ? '此遗迹已探索完毕'
                : !ruin.attemptActive
                  ? '选择开始探索'
                  : ruin.currentPos === 'entrance'
                    ? '选择一条路径前进'
                    : (ruin.passed ?? []).includes(String(ruin.currentPos))
                      ? '已通过当前节点，选择下一方向'
                      : '前方出现禁制'}
            </p>
          </div>
          {ruin.completed ? (
            <div className="rounded-[10px] border border-yellow-400/50 bg-yellow-400/10 px-3 py-1.5 text-xs text-yellow-200">
              已探索
            </div>
          ) : null}
        </div>
      </div>

      {/* 地图区域 */}
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative" style={{ width: canvasW, height: canvasH }}>
          {/* SVG 连接线 */}
          <svg
            width={canvasW}
            height={canvasH}
            className="pointer-events-none absolute inset-0"
            style={{ zIndex: 0 }}
          >
            {ruin.edges.map((edge) => {
              const from = nodePositions.get(edge.fromId)
              const to = nodePositions.get(edge.toId)
              if (!from || !to) return null
              const isToPassed = (ruin.passed ?? []).includes(edge.toId)
              const isReachableNow = !isToPassed && reachable.some((n) => n.id === edge.toId)
              const strokeColor = isToPassed
                ? 'rgba(52,211,153,0.35)'
                : isReachableNow
                  ? 'rgba(251,191,36,0.45)'
                  : 'rgba(148,120,80,0.18)'
              return (
                <line
                  key={`${edge.fromId}-${edge.toId}`}
                  x1={from.cx + NODE_W}
                  y1={from.cy + NODE_H / 2}
                  x2={to.cx}
                  y2={to.cy + NODE_H / 2}
                  stroke={strokeColor}
                  strokeWidth={2}
                  strokeDasharray={isToPassed ? 'none' : '4 3'}
                />
              )
            })}
          </svg>

          {/* 入口 */}
          <div
            className={`absolute flex items-center justify-center rounded-[14px] border text-sm font-medium transition-all ${
              ruin.currentPos === 'entrance' && ruin.attemptActive
                ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
                : 'border-white/10 bg-white/5 text-slate-400'
            }`}
            style={{
              left: entranceX,
              top: entranceCY - ENTRANCE_H / 2,
              width: ENTRANCE_W,
              height: ENTRANCE_H,
              zIndex: 1,
            }}
          >
            入口
          </div>

          {/* 各层节点 */}
          {ruin.nodes.map((node) => {
            const pos = nodePositions.get(node.id)
            if (!pos) return null
            const isReachable = reachable.some((n) => n.id === node.id)
            const isCurrentPos = ruin.currentPos === node.id && ruin.attemptActive
            const isPassed = (ruin.passed ?? []).includes(node.id)
            const isRevealed = ruin.revealed.includes(node.id) || ruin.completed

            // 样式
            let style = 'border-slate-600/25 bg-slate-800/20 text-slate-500'
            if (ruin.completed) {
              style = 'border-emerald-400/30 bg-emerald-400/8 text-emerald-300/60'
            } else if (isCurrentPos) {
              style = 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
            } else if (isPassed) {
              style = 'border-emerald-400/30 bg-emerald-400/8 text-emerald-300/60'
            } else if (isReachable) {
              style = 'border-slate-400/35 bg-slate-400/10 text-slate-300 cursor-pointer hover:border-amber-400/55 hover:bg-amber-400/12 hover:text-amber-200 hover:shadow-[0_0_16px_rgba(251,191,36,0.15)]'
            }

            return (
              <div
                key={node.id}
                className={`absolute flex flex-col items-center justify-center rounded-[12px] border text-xs transition-all ${style}`}
                style={{
                  left: pos.cx,
                  top: pos.cy,
                  width: NODE_W,
                  height: NODE_H,
                  zIndex: 1,
                }}
                onClick={() => {
                  if (isReachable && !isPassed && !ruin.completed) onAdvanceNode(node.id)
                }}
                title={isRevealed ? `${obstacleLabelMap[node.obstacle]} · 难度 ${node.difficulty}` : ''}
              >
                {isRevealed ? (
                  <>
                    <span className="text-base font-bold">
                      {node.obstacle === 'formation' ? '阵' : node.obstacle === 'poison' ? '毒' : node.obstacle === 'sword' ? '剑' : '通'}
                    </span>
                    <span className="mt-0.5 text-[10px] opacity-80">难度 {node.difficulty}</span>
                  </>
                ) : (
                  <span className="text-base font-bold">?</span>
                )}
              </div>
            )
          })}

          {/* 终点（始终显示，装饰性） */}
          <div
            className={`absolute flex items-center justify-center rounded-[14px] border text-sm font-medium transition-all ${
              ruin.completed
                ? 'border-yellow-400/60 bg-yellow-400/12 text-yellow-200'
                : 'border-white/8 bg-white/3 text-slate-500'
            }`}
            style={{
              left: destX,
              top: destCY - DEST_H / 2,
              width: DEST_W,
              height: DEST_H,
              zIndex: 1,
            }}
          >
            终点
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      {!ruin.completed ? (
        <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] px-5 py-3">
          <div className="flex items-center justify-between text-xs text-[#d8c2a0]">
            <span>船员: {session.player.airshipCrew}</span>
            {ruin.attemptActive ? (
              <>
                <span>已通过: {(ruin.passed ?? []).length}/{ruin.nodes.length}</span>
                <span>
                  {ruin.currentPos === 'entrance'
                    ? '选择前进方向'
                    : (ruin.passed ?? []).includes(String(ruin.currentPos))
                      ? '可继续前进'
                      : '前方有禁制'}
                </span>
              </>
            ) : (
              <span>点击按钮开始探索</span>
            )}
          </div>
          {reachable.length > 0 ? (
            <p className="mt-1.5 text-[11px] text-amber-200/50">
              点击高亮节点向前探索 · 虚线表示未走过的路径
            </p>
          ) : null}
          {!ruin.attemptActive ? (
            <button className="action mt-3 w-full" onClick={onStartAttempt}>
              {ruin.revealed.length > 0 ? '再次尝试' : '开始探索'}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[18px] border border-yellow-400/20 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] px-5 py-3">
          <p className="text-center text-xs text-yellow-200/60">
            此遗迹秘境已被彻底探索，深处秘密尽收囊中。声望 +100。
          </p>
        </div>
      )}
    </div>
  )
}

function getLayerNodes(ruin: NonNullable<NonNullable<ReturnType<typeof getCurrentNode>['ruinExploration']>>) {
  const maxLayer = Math.max(...ruin.nodes.map((n) => n.layer), 0)
  const layers: typeof ruin.nodes[] = []
  for (let i = 0; i <= maxLayer; i += 1) {
    layers.push(ruin.nodes.filter((n) => n.layer === i))
  }
  return layers
}
