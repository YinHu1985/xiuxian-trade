import { useRef, useState } from 'react'
import { nodeTypeLabelMap } from '@/game/data'
import { getAdjacentNodes } from '@/game/engine'
import { cn } from '@/lib/utils'
import type { GameSession } from '@/game/types'

interface MapPanelProps {
  session: GameSession
  onSelectNode: (nodeId: string) => void
  className?: string
  compact?: boolean
  revealAll?: boolean
  showFooter?: boolean
  frameless?: boolean
  backgroundImageUrl?: string
  highlightedNodeIds?: string[]
}

export default function MapPanel({
  session,
  onSelectNode,
  className,
  compact = false,
  revealAll = false,
  showFooter = true,
  frameless = false,
  backgroundImageUrl,
  highlightedNodeIds = [],
}: MapPanelProps) {
  const selectedNode = session.world.nodes.find((node) => node.id === session.world.selectedNodeId)
  const highlightedNodeSet = new Set(highlightedNodeIds)
  const plannedTargetNodeId = session.world.pendingPlan?.targetNodeId
  const initialZoom = frameless ? 1 : compact ? 1.08 : 1.14
  const [zoom, setZoom] = useState(initialZoom)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragPointRef = useRef<{ x: number; y: number } | null>(null)

  const clampZoom = (value: number) => Math.min(1.9, Math.max(0.8, Number(value.toFixed(2))))

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setZoom((value) => clampZoom(value + delta))
  }

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).closest('[data-map-node="true"]')) return
    dragPointRef.current = { x: event.clientX, y: event.clientY }
    setDragging(true)
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragPointRef.current) return
    const dx = event.clientX - dragPointRef.current.x
    const dy = event.clientY - dragPointRef.current.y
    dragPointRef.current = { x: event.clientX, y: event.clientY }
    setPan((value) => ({ x: value.x + dx, y: value.y + dy }))
  }

  const stopDragging = () => {
    dragPointRef.current = null
    setDragging(false)
  }

  return (
    <section
      className={cn(
        'relative grid h-full min-h-0 overflow-hidden',
        frameless
          ? 'rounded-[22px] border border-[#2f2015]/70 bg-[radial-gradient(circle_at_top,rgba(104,69,40,0.28),transparent_34%),linear-gradient(180deg,#4b3322,#2f2016)] shadow-[inset_0_1px_0_rgba(255,231,192,0.05)]'
          : 'rounded-[30px] border border-amber-900/30 bg-[#e6d3a9]',
        frameless ? 'grid-rows-[minmax(0,1fr)]' : showFooter ? 'grid-rows-[auto_minmax(0,1fr)_auto]' : 'grid-rows-[auto_minmax(0,1fr)]',
        frameless ? 'p-0' : compact ? 'p-4' : 'p-6',
        className,
      )}
    >
      {!frameless ? (
        <>
          {backgroundImageUrl ? (
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-32"
              style={{ backgroundImage: `url("${backgroundImageUrl}")` }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,247,221,0.75),rgba(230,211,169,0.85)_38%,rgba(201,167,106,0.75)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(120,74,34,0.06)_1px,transparent_1px),linear-gradient(rgba(120,74,34,0.06)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
          <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(112,78,42,0.24)_0.8px,transparent_0.8px)] [background-size:18px_18px] opacity-25" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(24,15,10,0.16)_1px,transparent_1px),linear-gradient(rgba(24,15,10,0.14)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[21px] border border-[#8e6b46]/18" />
        </>
      )}
      {!frameless ? (
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-950/55">山河舆图</p>
            <h2 className={cn('mt-2 font-serif text-amber-950', compact ? 'text-lg' : 'text-xl')}>商路手绘图</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn('rounded-full border border-amber-900/25 bg-white/40 text-amber-950 transition hover:bg-white/60', compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base')}
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              aria-label="缩小地图"
            >
              -
            </button>
            <button
              type="button"
              className={cn('rounded-full border border-amber-900/25 bg-white/40 text-amber-950 transition hover:bg-white/60', compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base')}
              onClick={() => {
                setZoom(initialZoom)
                setPan({ x: 0, y: 0 })
              }}
              aria-label="重置地图"
            >
              ·
            </button>
            <button
              type="button"
              className={cn('rounded-full border border-amber-900/25 bg-white/40 text-amber-950 transition hover:bg-white/60', compact ? 'h-8 w-8 text-sm' : 'h-9 w-9 text-base')}
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              aria-label="放大地图"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'relative min-h-0 flex-[1_1_0%] basis-0 overflow-hidden select-none touch-none',
          frameless
            ? 'mt-0 rounded-[20px] border border-[#24170f]/70 bg-[linear-gradient(180deg,#3d2a1d,#2d1f16)] shadow-[inset_0_1px_0_rgba(255,230,196,0.04),0_14px_32px_rgba(16,10,7,0.24)]'
            : 'mt-4 rounded-[24px] border border-amber-900/25 bg-[#f2e4c5]',
          compact ? 'h-full' : 'h-[520px]',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
      >
        <div
          className={cn(
            'absolute',
            frameless ? 'inset-[3.5%]' : 'inset-0',
          )}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '50% 50%',
          }}
        >
          <div
            className={cn(
              'relative h-full w-full overflow-hidden',
              frameless
                ? 'rounded-[18px] border-[9px] border-[#5d4330] bg-[#e7d0a1] shadow-[inset_0_0_0_1px_rgba(86,56,31,0.35),inset_0_0_0_6px_rgba(236,214,170,0.55),0_20px_36px_rgba(20,12,8,0.28)]'
                : '',
            )}
          >
            {backgroundImageUrl ? (
              <div
                className={cn('pointer-events-none absolute inset-0 bg-cover bg-center', frameless ? 'opacity-70 saturate-[0.88]' : 'opacity-32')}
                style={{ backgroundImage: `url("${backgroundImageUrl}")` }}
              />
            ) : null}
            <div className={cn('pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,247,221,0.75),rgba(230,211,169,0.85)_38%,rgba(201,167,106,0.75)_100%)]', frameless ? 'opacity-76' : '')} />
            <div className={cn('pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(120,74,34,0.06)_1px,transparent_1px),linear-gradient(rgba(120,74,34,0.06)_1px,transparent_1px)] bg-[size:42px_42px]', frameless ? 'opacity-12' : 'opacity-20')} />
            <div className={cn('pointer-events-none absolute inset-0 [background-image:radial-gradient(rgba(112,78,42,0.24)_0.8px,transparent_0.8px)] [background-size:18px_18px]', frameless ? 'opacity-16' : 'opacity-25')} />
            <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_10%_12%,rgba(102,60,24,0.12),transparent_18%),radial-gradient(circle_at_86%_18%,rgba(102,60,24,0.12),transparent_16%),radial-gradient(circle_at_22%_82%,rgba(102,60,24,0.12),transparent_20%),radial-gradient(circle_at_72%_76%,rgba(102,60,24,0.12),transparent_18%)]" />
            {frameless ? (
              <>
                <div className="pointer-events-none absolute inset-[10px] rounded-[10px] border border-[#f4e2ba]/45" />
                <div className="pointer-events-none absolute inset-x-8 top-[10px] h-px bg-[linear-gradient(90deg,transparent,rgba(255,236,196,0.72),transparent)]" />
              </>
            ) : null}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {session.world.edges.map((edge) => {
                const from = session.world.nodes.find((node) => node.id === edge.fromNodeId)
                const to = session.world.nodes.find((node) => node.id === edge.toNodeId)
                if (!from || !to || (!revealAll && edge.discovery === 'hidden')) return null
                const route = createInkRoute(from, to, edge.id)
                if (!route) return null
                return (
                  <InkRoad
                    key={edge.id}
                    d={route}
                    discovery={edge.discovery === 'confirmed' ? 'confirmed' : 'rumor'}
                    familiarityLevel={edge.familiarityLevel}
                  />
                )
              })}
            </svg>
            {session.world.nodes.map((node) => {
              if (!revealAll && node.discovery === 'hidden') return null
              const isCurrent = session.player.currentNodeId === node.id
              const isSelected = selectedNode?.id === node.id
              const isHighlighted = highlightedNodeSet.has(node.id)
              const hasPlannedTarget = plannedTargetNodeId === node.id
              const hasBranch = Boolean(node.branchId)
              return (
                <button
                  key={node.id}
                  type="button"
                  data-map-node="true"
                  onClick={() => onSelectNode(node.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  {isHighlighted ? (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e8c98d]/75 bg-[#f5dfb1]/18 shadow-[0_0_0_4px_rgba(236,207,148,0.1)]" />
                  ) : null}
                  {(isCurrent || hasPlannedTarget) ? (
                    <span className="pointer-events-none absolute left-1 top-1 z-10 flex -translate-x-[92%] -translate-y-[96%] flex-col items-start gap-1">
                      {isCurrent ? <CurrentShipMarker /> : null}
                      {hasPlannedTarget ? <PlanTargetMarker /> : null}
                    </span>
                  ) : null}
                  {hasBranch ? (
                    <span className="pointer-events-none absolute right-1 top-1 z-10 -translate-y-[92%] translate-x-[92%]">
                      <BranchMarker />
                    </span>
                  ) : null}
                  <span
                    className={[
                      'relative block transition',
                      isCurrent ? 'scale-110' : '',
                      isSelected ? 'drop-shadow-[0_0_8px_rgba(120,74,34,0.45)]' : '',
                    ].join(' ')}
                  >
                    <HandDrawnNode type={node.type} hidden={node.discovery === 'hidden'} isCurrent={isCurrent} />
                  </span>
                  {isSelected ? (
                    <span
                      className={cn(
                        'pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-xl border border-amber-900/20 bg-[#f7edd7]/95 text-amber-950 shadow-sm whitespace-nowrap',
                        compact ? 'px-2 py-1 text-[11px] leading-4' : 'px-3 py-2 text-xs leading-5',
                      )}
                    >
                      <strong className={cn('block', compact ? 'text-xs' : 'text-sm')}>{node.name}</strong>
                      <span className="text-amber-900/75">{nodeTypeLabelMap[node.type]}</span>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {showFooter && !frameless ? (
        <div className="relative mt-4 grid gap-3 md:grid-cols-2">
          <InfoCard title="选中据点" value={selectedNode?.name ?? '未选择'} />
          <InfoCard
            title="相邻可见据点"
            value={selectedNode ? getAdjacentNodes(session, selectedNode.id).filter((item) => revealAll || item.node.discovery !== 'hidden').length : 0}
          />
        </div>
      ) : null}
    </section>
  )
}

function CurrentShipMarker() {
  return (
    <svg viewBox="0 0 44 28" className="h-7 w-11 drop-shadow-[0_6px_10px_rgba(36,20,10,0.34)]" aria-hidden="true">
      <path d="M21 3L21 15" stroke="#5B3518" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M21 4C26.5 5.8 29.5 8.8 33 14H21V4Z" fill="#ead8b0" stroke="#6b4321" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 18C13 16.8 17 16.2 22 16.2C27.4 16.2 31.7 16.8 35.3 18L31.6 22.8H12L9 18Z" fill="#6d4425" stroke="#3f2512" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 18.6C10.9 21 15.9 22.2 22 22.2C28.1 22.2 33 21 36.8 18.8" stroke="#caa56a" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M12 24.4H31.2" stroke="#f2e2c2" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

function PlanTargetMarker() {
  return (
    <span className="inline-flex items-center rounded-[10px] border border-[#d8b16d]/78 bg-[linear-gradient(180deg,rgba(111,73,38,0.98),rgba(71,46,26,0.96))] px-2 py-1 text-[10px] leading-none text-[#fff3db] shadow-[0_6px_14px_rgba(34,18,9,0.28)]">
      计划中
    </span>
  )
}

function BranchMarker() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d9b779]/75 bg-[linear-gradient(180deg,rgba(92,63,37,0.98),rgba(60,40,24,0.96))] text-[12px] text-[#fff1d6] shadow-[0_6px_14px_rgba(34,18,9,0.26)]">
      商
    </span>
  )
}

function createInkRoute(from: { x: number; y: number }, to: { x: number; y: number }, seed: string) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy)
  if (distance < 0.001) return null

  const ux = dx / distance
  const uy = dy / distance
  const inset = Math.min(2.6, Math.max(1.45, distance * 0.14))
  const startX = from.x + ux * inset
  const startY = from.y + uy * inset
  const endX = to.x - ux * inset
  const endY = to.y - uy * inset

  const px = -uy
  const py = ux
  const bendSeed = hashToUnit(seed)
  const bendAmount = Math.min(2.2, Math.max(0.45, distance * 0.085)) * (bendSeed > 0.5 ? 1 : -1)
  const controlX = (startX + endX) / 2 + px * bendAmount
  const controlY = (startY + endY) / 2 + py * bendAmount

  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
}

function hashToUnit(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return (hash % 1000) / 1000
}

function InkRoad({
  d,
  discovery,
  familiarityLevel,
}: {
  d: string
  discovery: 'rumor' | 'confirmed'
  familiarityLevel: number
}) {
  const confirmed = discovery === 'confirmed'
  const baseWidth = confirmed ? 1.42 + familiarityLevel * 0.1 : 1
  const underStroke = confirmed ? 'rgba(185, 140, 86, 0.34)' : 'rgba(231, 199, 137, 0.18)'
  const mainStroke = confirmed ? 'rgba(88, 54, 25, 0.92)' : 'rgba(207, 168, 101, 0.72)'
  const accentStroke = confirmed ? 'rgba(128, 83, 43, 0.46)' : 'rgba(245, 227, 192, 0.44)'
  const dashArray = confirmed ? undefined : '2.1 3.3'
  const accentDash = confirmed ? undefined : '1.2 4.2'

  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={underStroke}
        strokeWidth={confirmed ? baseWidth + 1.2 : baseWidth + 0.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      <path
        d={d}
        fill="none"
        stroke={mainStroke}
        strokeWidth={baseWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashArray}
      />
      <path
        d={d}
        fill="none"
        stroke={accentStroke}
        strokeWidth={Math.max(0.38, baseWidth * 0.4)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={accentDash}
      />
    </>
  )
}

function HandDrawnNode({
  type,
  hidden,
  isCurrent,
}: {
  type: keyof typeof nodeTypeLabelMap
  hidden: boolean
  isCurrent: boolean
}) {
  const stroke = hidden ? 'rgba(118, 80, 45, 0.52)' : 'rgba(88, 52, 24, 0.92)'
  const underStroke = hidden ? 'rgba(164, 123, 75, 0.2)' : 'rgba(164, 123, 75, 0.28)'
  const fill = hidden ? 'rgba(217, 195, 154, 0.32)' : 'rgba(255, 248, 234, 0.82)'

  return (
    <span className={cn('block h-9 w-9 drop-shadow-sm transition', isCurrent ? 'scale-110' : '', hidden ? 'opacity-70' : '')}>
      <svg viewBox="0 0 36 36" className={cn('h-full w-full overflow-visible', isCurrent ? 'drop-shadow-[0_0_4px_rgba(120,74,34,0.25)]' : '')} aria-hidden="true">
        {type === 'town' ? <TownIcon stroke={stroke} underStroke={underStroke} fill={fill} /> : null}
        {type === 'sect' ? <SectIcon stroke={stroke} underStroke={underStroke} fill={fill} /> : null}
        {type === 'ruin' ? <RuinIcon stroke={stroke} underStroke={underStroke} fill={fill} /> : null}
        {type === 'special' ? <SpecialIcon stroke={stroke} underStroke={underStroke} fill={fill} /> : null}
      </svg>
    </span>
  )
}

function InkStroke({
  d,
  stroke,
  underStroke,
  width = 2.2,
  fill = 'none',
  opacity,
  dashArray,
}: {
  d: string
  stroke: string
  underStroke: string
  width?: number
  fill?: string
  opacity?: number
  dashArray?: string
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={underStroke}
        strokeWidth={width + 1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity ?? 1}
        strokeDasharray={dashArray}
      />
      <path
        d={d}
        fill={fill}
        stroke={fill === 'none' ? stroke : undefined}
        strokeWidth={fill === 'none' ? width : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity ?? 1}
        strokeDasharray={dashArray}
      />
    </>
  )
}

function TownIcon({ stroke, underStroke, fill }: { stroke: string; underStroke: string; fill: string }) {
  return (
    <g>
      <InkStroke d="M7 14.5 L18 8.8 L29 14.5" stroke={stroke} underStroke={underStroke} width={2.5} />
      <InkStroke d="M10.5 14.8 L10.5 25.5" stroke={stroke} underStroke={underStroke} width={2.3} />
      <InkStroke d="M25.5 14.8 L25.5 25.5" stroke={stroke} underStroke={underStroke} width={2.3} />
      <InkStroke d="M10.5 25.4 L25.5 25.4" stroke={stroke} underStroke={underStroke} width={2.3} />
      <path d="M13.5 15.3 L22.5 15.3 L22.5 25.2 L13.5 25.2 Z" fill={fill} stroke="none" />
      <InkStroke d="M16.2 25.2 L16.2 19.7 Q18 17.8 19.8 19.7 L19.8 25.2" stroke={stroke} underStroke={underStroke} width={2.1} />
      <InkStroke d="M13.8 17.6 L22.2 17.6" stroke={stroke} underStroke={underStroke} width={1.6} opacity={0.85} />
      <InkStroke d="M8.4 27.7 Q18 24.8 27.7 27.7" stroke={stroke} underStroke={underStroke} width={1.8} opacity={0.8} />
    </g>
  )
}

function SectIcon({ stroke, underStroke, fill }: { stroke: string; underStroke: string; fill: string }) {
  return (
    <g>
      <path d="M8.2 25.8 L14.8 13.2 L18.3 18.4 L22.6 9.4 L28.8 25.8 Z" fill={fill} stroke="none" />
      <InkStroke d="M8.2 25.8 L14.8 13.2 L18.3 18.4 L22.6 9.4 L28.8 25.8" stroke={stroke} underStroke={underStroke} width={2.35} />
      <InkStroke d="M14.4 26 L18 21.4 L21.6 26" stroke={stroke} underStroke={underStroke} width={2.05} />
      <InkStroke d="M15.6 17.2 Q17.6 15.6 19.1 17.5" stroke={stroke} underStroke={underStroke} width={1.6} opacity={0.85} />
      <InkStroke d="M10.2 28.1 Q18 26.2 25.9 28.1" stroke={stroke} underStroke={underStroke} width={1.7} opacity={0.82} />
    </g>
  )
}

function RuinIcon({ stroke, underStroke, fill }: { stroke: string; underStroke: string; fill: string }) {
  return (
    <g>
      <path d="M9.5 25.6 L11.8 15.2 L16.1 17.2 L18.8 12.6 L22.2 14.8 L24.6 10.7 L27.2 25.6 Z" fill={fill} stroke="none" />
      <InkStroke d="M9.5 25.6 L11.8 15.2 L16.1 17.2 L18.8 12.6 L22.2 14.8 L24.6 10.7 L27.2 25.6" stroke={stroke} underStroke={underStroke} width={2.2} />
      <InkStroke d="M14.7 25.1 L15.4 19.7" stroke={stroke} underStroke={underStroke} width={1.85} />
      <InkStroke d="M21.3 25.1 L21.9 17.6" stroke={stroke} underStroke={underStroke} width={1.85} />
      <InkStroke d="M12.3 20.2 L17.7 18.2" stroke={stroke} underStroke={underStroke} width={1.5} opacity={0.8} dashArray="1.4 2.8" />
      <InkStroke d="M10.3 28.1 Q18 26.5 26.6 28.1" stroke={stroke} underStroke={underStroke} width={1.7} opacity={0.82} />
    </g>
  )
}

function SpecialIcon({ stroke, underStroke, fill }: { stroke: string; underStroke: string; fill: string }) {
  return (
    <g>
      <path d="M18 9.6 L21.2 14.9 L26.6 16.1 L22.7 20.2 L23.5 25.8 L18 23.3 L12.5 25.8 L13.3 20.2 L9.4 16.1 L14.8 14.9 Z" fill={fill} stroke="none" />
      <InkStroke d="M18 9.6 L21.2 14.9 L26.6 16.1 L22.7 20.2 L23.5 25.8 L18 23.3 L12.5 25.8 L13.3 20.2 L9.4 16.1 L14.8 14.9 Z" stroke={stroke} underStroke={underStroke} width={2.15} />
      <InkStroke d="M18 11.6 L18 21.9" stroke={stroke} underStroke={underStroke} width={1.7} opacity={0.88} />
      <InkStroke d="M14.5 18.1 L21.5 18.1" stroke={stroke} underStroke={underStroke} width={1.55} opacity={0.82} />
      <InkStroke d="M10.4 28 Q18.2 25.7 25.6 28" stroke={stroke} underStroke={underStroke} width={1.7} opacity={0.82} />
    </g>
  )
}

function InfoCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-amber-900/20 bg-[#f7edd7]/90 px-4 py-3 text-amber-950">
      <p className="text-xs uppercase tracking-[0.25em] text-amber-900/60">{title}</p>
      <p className="mt-2 text-lg">{value}</p>
    </div>
  )
}
