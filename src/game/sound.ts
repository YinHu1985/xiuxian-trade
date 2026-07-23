import type { NodeType } from '@/game/types'

const base = import.meta.env.BASE_URL

/* ====================== 背景音乐 ====================== */

const musicPaths: Record<string, string> = {
  town: `${base}musics/town.ogg`,
  sect: `${base}musics/sect.ogg`,
  ruin: `${base}musics/ruin.ogg`,
  special: `${base}musics/special.ogg`,
  main: `${base}musics/main.ogg`,
}

let currentAudio: HTMLAudioElement | null = null
let currentMusicKey: string | null = null
let pendingRetry: { audio: HTMLAudioElement; key: string } | null = null
let retryListenerAttached = false

let musicVolume = 0.5
let sfxVolume = 0.7

export function getMusicVolume() { return musicVolume }
export function getSfxVolume() { return sfxVolume }

export function setMusicVolume(v: number) {
  musicVolume = v
  if (currentAudio) {
    currentAudio.volume = v
  }
}

export function setSfxVolume(v: number) {
  sfxVolume = v
}

function attachRetryListener() {
  if (retryListenerAttached) return
  retryListenerAttached = true
  const handler = () => {
    if (pendingRetry) {
      pendingRetry.audio.play().catch(() => {})
      pendingRetry = null
    }
    document.removeEventListener('click', handler, true)
    document.removeEventListener('keydown', handler, true)
    retryListenerAttached = false
  }
  document.addEventListener('click', handler, true)
  document.addEventListener('keydown', handler, true)
}

/** 播放背景音乐，自动停止前一段 */
export function playMusic(key: string, loop = true) {
  if (key === currentMusicKey) return
  stopMusic()
  const path = musicPaths[key]
  if (!path) {
    console.warn(`[sound] unknown music key: ${key}`)
    return
  }
  const audio = new Audio(path)
  audio.loop = loop
  audio.volume = musicVolume
  const playPromise = audio.play()
  if (playPromise) {
    playPromise.catch(() => {
      // 浏览器自动播放策略限制：暂存 audio，等首次用户交互后重试
      pendingRetry = { audio, key }
      attachRetryListener()
    })
  }
  currentAudio = audio
  currentMusicKey = key
}

export function stopMusic() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
    currentMusicKey = null
  }
}

/** 根据据点类型播放对应音乐 */
export function playNodeMusic(type: NodeType) {
  playMusic(type)
}

/* ====================== 音效（ZzFX 合成） ====================== */

import { zzfx } from 'zzfx'

const sfxPresets: Record<string, number[]> = {
  click: [.7,,244,.01,,.02,4,1.6,,,83,.04,,,,,,.9,.03,,-1500],
  trade: [.7,,244,.01,,.02,4,1.6,,,83,.04,,,,,,.9,.03,,-1500],
  confirm: [.7,,244,.01,,.02,4,1.6,,,83,.04,,,,,,.9,.03,,-1500],
}

export function playSfx(key: string) {
  const base = sfxPresets[key]
  if (!base) {
    console.warn(`[sound] unknown sfx key: ${key}`)
    return
  }
  // 复制参数并将首位音量乘以全局 sfxVolume
  const params = [...base]
  params[0] = (params[0] ?? 1) * sfxVolume
  zzfx(...params)
}

/** 初始化音效系统（ZzFX 无需预加载，保留接口以备将来扩展） */
export function initSfx() {
  // ZzFX is ready immediately
}
