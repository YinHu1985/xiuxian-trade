import { useState } from 'react'
import { getMusicVolume, getSfxVolume, setMusicVolume, setSfxVolume } from '@/game/sound'

export default function SettingsPanel() {
  const [musicVol, setMusicVol] = useState(getMusicVolume())
  const [sfxVol, setSfxVol] = useState(getSfxVolume())

  return (
    <div className="rounded-[18px] border border-[#7a5a36]/58 bg-[linear-gradient(180deg,rgba(67,45,28,0.97),rgba(41,28,19,0.95))] p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-100/40">音量</p>
      <div className="mt-5 space-y-5">
        <label className="block">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#ead8ba]">背景音乐</span>
            <span className="rounded-full border border-[#7c5c39]/45 px-3 py-0.5 text-xs text-amber-100">{Math.round(musicVol * 100)}%</span>
          </div>
          <input
            className="mt-3 w-full accent-amber-300"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVol}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMusicVol(v)
              setMusicVolume(v)
            }}
          />
        </label>
        <label className="block">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#ead8ba]">音效</span>
            <span className="rounded-full border border-[#7c5c39]/45 px-3 py-0.5 text-xs text-amber-100">{Math.round(sfxVol * 100)}%</span>
          </div>
          <input
            className="mt-3 w-full accent-amber-300"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sfxVol}
            onChange={(e) => {
              const v = Number(e.target.value)
              setSfxVol(v)
              setSfxVolume(v)
            }}
          />
        </label>
      </div>
    </div>
  )
}
