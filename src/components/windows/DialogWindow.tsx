import { useState } from 'react'

type DialogMode = 'plain' | 'inline-image' | 'portrait-left' | 'portrait-right'

export function DialogWindow({
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
  buttons: { label: string; onClick: () => void; effectsDesc?: string }[]
}) {
  const withPortrait = mode === 'portrait-left' || mode === 'portrait-right'
  const isLeft = mode === 'portrait-left'
  const [portraitErrored, setPortraitErrored] = useState(false)
  const showPortrait = Boolean(portraitUrl) && !portraitErrored

  return (
    <div className="absolute inset-0 z-20 flex justify-center bg-[#1d140d]/76 backdrop-blur-sm">
      {!withPortrait ? (
        <div className="flex items-center">
          <div className="relative w-[480px] max-w-[86%] overflow-hidden rounded-[20px] border border-[#7a5b36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] p-6 shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,229,177,0.42),transparent)]" />
            <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">消息</p>
            <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
            {mode === 'inline-image' && imageUrl ? (
              <img src={imageUrl} alt="" className="mt-4 w-full rounded-[14px] border border-[#7a5a36]/50 object-cover" onError={() => setPortraitErrored(true)} />
            ) : null}
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#ead8ba]">{content}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {buttons.map((button, index) => (
                <button key={index} className="action" onClick={button.onClick}>
                  <span>{button.label}</span>
                  {button.effectsDesc ? (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-amber-200/80">
                      {button.effectsDesc}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative mt-[40vh]">
          {showPortrait ? (
            <div className={`absolute bottom-full z-30 ${isLeft ? 'left-10' : 'right-16'}`}>
              <div className="relative flex flex-col items-center">
                <div className="relative">
                  <img src={portraitUrl} alt={characterName ?? ''} className="h-[260px] w-auto select-none" draggable={false} onError={() => setPortraitErrored(true)} />
                  {characterName ? (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-[10px] border border-[#7a5a36]/50 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] px-3 py-1 text-xs text-[#cdb48a] whitespace-nowrap">
                      {characterName}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex w-[880px] max-w-[86%] flex-col overflow-hidden rounded-[20px] border border-[#7a5a36]/60 bg-[linear-gradient(180deg,rgba(48,32,21,0.99),rgba(30,21,14,0.98))] shadow-[0_30px_100px_rgba(28,16,8,0.9)]">
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,229,177,0.42),transparent)]" />
            <div className="max-h-[55vh] overflow-y-auto p-6">
               <p className="text-xs uppercase tracking-[0.32em] text-amber-100/40">消息</p>
               <h2 className="mt-2 font-serif text-2xl text-[#fff4dd]">{title}</h2>
               <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#ead8ba]">{content}</p>
            </div>
            <div className="flex-shrink-0 border-t border-[#7a5a36]/30 px-6 py-4">
              <div className="flex flex-wrap gap-3">
                {buttons.map((button, index) => (
                  <button key={index} className="action" onClick={button.onClick}>
                    <span>{button.label}</span>
                    {button.effectsDesc ? (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-amber-200/80">
                        {button.effectsDesc}
                      </span>
                    ) : null}
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
