import { Compass, FastForward, Gem, Network, ScrollText, Settings2, UserRound, X } from 'lucide-react'
import type { GameSession } from '@/game/types'

interface TopBarProps {
  session: GameSession
  activeView: 'town' | 'airship' | 'map'
  planTitle: string
  hasPendingPlan: boolean
  isExecutingPlan?: boolean
  onChangeView: (view: 'town' | 'airship' | 'map') => void
  onExecuteTurn?: () => void
  onClearPlan?: () => void
  onOpenSettings?: () => void
}

export default function TopBar({
  session,
  activeView,
  planTitle,
  hasPendingPlan,
  isExecutingPlan = false,
  onChangeView,
  onExecuteTurn,
  onClearPlan,
  onOpenSettings,
}: TopBarProps) {
  return (
    <header className="relative overflow-hidden rounded-[18px] border border-[#7a5a36]/60 bg-[linear-gradient(180deg,rgba(51,34,22,0.98),rgba(32,21,14,0.96))] px-5 py-3 shadow-[0_16px_42px_rgba(28,17,8,0.34)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,230,180,0.4),transparent)]" />
      <div className="grid grid-cols-[auto_minmax(0,1.95fr)_124px] grid-rows-[auto_auto] gap-x-6 gap-y-2">
        <div className="row-span-2 flex min-w-0 items-center gap-3">
          <svg viewBox="0 0 40 40" className="h-[88px] w-[88px] shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.32)]">
            <rect x="2" y="2" width="36" height="36" rx="4" fill="#6b4c30" stroke="#c9995c" strokeWidth="1.5" />
            <path d="M8 10 h16 v12 h-16 z" fill="#be7c4b" stroke="#eccc8a" strokeWidth="0.8" />
            <path d="M24 10 h8 v8 h-8 z" fill="#a1683b" stroke="#eccc8a" strokeWidth="0.8" />
            <circle cx="14" cy="20" r="3" fill="none" stroke="#f0dfb0" strokeWidth="0.8" />
            <path d="M14 23 v8 h4 v-8" fill="none" stroke="#d9b880" strokeWidth="1.2" />
            <path d="M28 8 l4 -3 v8 l-4 -3" fill="none" stroke="#eccc8a" strokeWidth="1.2" />
          </svg>
          <h1 className="min-w-0 truncate font-serif text-3xl text-[#fff4dd] mr-6">{session.guild.name || '太虚商会'}</h1>
        </div>
        <div className="-mt-0.5 flex min-w-0 items-center gap-2 pl-8">
          <Stat icon={<ScrollText size={14} />} label="回合" value={`${session.world.currentTurn}/${session.world.maxTurns}`} />
          <Stat icon={<Gem size={14} />} label="灵石" value={session.player.spiritStone} />
          <Stat icon={<Compass size={14} />} label="移动" value={session.player.moveRange} />
          <Stat icon={<UserRound size={14} />} label="供奉" value={`${session.guild.retainers.length}/${session.player.retainerCapacity}`} />
          <Stat icon={<Network size={14} />} label="商路" value={session.guild.tradeLinks.length} />
          {onOpenSettings ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#7e5d39]/55 bg-[linear-gradient(180deg,rgba(73,48,29,0.96),rgba(48,31,20,0.94))] text-amber-200/80 transition hover:border-[#c59a5f]/60 hover:bg-[linear-gradient(180deg,rgba(95,62,36,0.98),rgba(60,39,24,0.95))] hover:text-[#fff4dd]"
            >
              <Settings2 size={16} />
            </button>
          ) : null}
        </div>
        <div className="row-span-2 flex items-stretch justify-end gap-2">
          {hasPendingPlan && onClearPlan ? (
            <button
              type="button"
              onClick={onClearPlan}
              disabled={isExecutingPlan}
              className="flex h-full w-10 items-center justify-center self-center rounded-[12px] border border-[#7e5d39]/55 bg-[linear-gradient(180deg,rgba(72,48,29,0.96),rgba(48,31,20,0.94))] text-amber-100/80 transition hover:border-[#c59a5f]/60 hover:text-[#fff4dd] disabled:cursor-not-allowed disabled:opacity-55"
              aria-label="清空本回合计划"
            >
              <X size={16} />
            </button>
          ) : null}
          {onExecuteTurn ? (
            <button
              type="button"
              onClick={onExecuteTurn}
              disabled={isExecutingPlan}
              data-sfx="confirm"
              className="flex h-full min-h-[88px] w-[112px] flex-col items-center justify-center rounded-[14px] border border-[#be8b50]/75 bg-[linear-gradient(180deg,rgba(122,83,44,0.98),rgba(81,54,29,0.96))] px-3 py-3 text-[#fff4dd] shadow-[0_10px_24px_rgba(24,14,8,0.24)] transition hover:border-[#d8b073] hover:bg-[linear-gradient(180deg,rgba(143,96,50,0.99),rgba(92,62,33,0.97))] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FastForward size={16} />
              <span className="mt-1 text-sm font-medium">{hasPendingPlan ? '执行计划' : '过回合'}</span>
              <span className="mt-1 text-center text-[11px] leading-4 text-[#f4e2bf]">{planTitle}</span>
            </button>
          ) : null}
        </div>
        <div className="flex w-fit min-w-0 items-center gap-2 pl-8">
          <MainNavButton label="城镇" active={activeView === 'town'} onClick={() => onChangeView('town')} />
          <MainNavButton label="飞舟" active={activeView === 'airship'} onClick={() => onChangeView('airship')} />
          <MainNavButton label="地图" active={activeView === 'map'} onClick={() => onChangeView('map')} />
        </div>
      </div>
    </header>
  )
}

function MainNavButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-[12px] border px-4 py-2 text-center transition',
        active
          ? 'border-[#c5975d]/70 bg-[linear-gradient(180deg,rgba(92,60,34,0.98),rgba(58,38,24,0.95))] text-[#fff4dd] shadow-[0_0_30px_rgba(251,191,36,0.08)]'
          : 'border-[#5f452c]/60 bg-[linear-gradient(180deg,rgba(54,36,23,0.94),rgba(34,23,16,0.94))] text-[#d6c19d] hover:border-[#84603a]/62 hover:bg-[linear-gradient(180deg,rgba(66,44,27,0.96),rgba(40,27,18,0.95))] hover:text-[#efe0c1]',
      ].join(' ')}
    >
      <div className="font-serif text-base">{label}</div>
    </button>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="min-w-[62px] px-1 py-0.5">
      <div className="flex items-center gap-1 text-[9px] tracking-[0.14em] text-[#cdb28c]">
        <span className="text-amber-300/90">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-0.5 pl-0.5 text-sm font-semibold text-[#fff4dd]">{value}</div>
    </div>
  )
}
