import React from 'react'

export function CompactPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[18px] border border-[#7a5a36]/55 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-5 shadow-[0_16px_60px_rgba(31,20,9,0.35)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,226,170,0.45),transparent)]" />
      <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">{title}</p>
      <h2 className="mt-2 font-serif text-lg text-[#fff4dd]">{subtitle}</h2>
      <div className="relative mt-4">{children}</div>
    </section>
  )
}

export function FloatingPanel({
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

export function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-[#7c5c39]/45 bg-[linear-gradient(180deg,rgba(92,61,36,0.9),rgba(58,38,24,0.88))] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.22em] text-amber-100/40">{label}</div>
      <div className="mt-2 text-base text-[#fff4dd]">{value}</div>
    </div>
  )
}

export function DisabledAction({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-[#6f5334]/35 bg-[linear-gradient(180deg,rgba(66,44,28,0.88),rgba(44,30,20,0.85))] px-4 py-4 text-sm text-[#b59a72]">
      {label}
      <span className="ml-2 text-xs text-[#a38a66]">预留</span>
    </div>
  )
}

export function OverlayFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

export function SceneAction({
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

export function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

export function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] border border-[#7b5b39]/42 bg-[linear-gradient(180deg,rgba(86,58,35,0.92),rgba(55,37,24,0.9))] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.24em] text-amber-100/40">{label}</p>
      <p className="mt-2 text-2xl text-[#fff4dd]">{value}</p>
    </div>
  )
}

export function TurnAdvanceOverlay({ planLabel }: { planLabel: string }) {
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
