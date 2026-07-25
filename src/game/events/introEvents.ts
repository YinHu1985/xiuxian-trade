import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

/**
 * 引导剧情事件
 * - intro_01 ~ intro_03：开局三连弹窗（init 触发，flag 链式串联）
 */
export const introEvents: StoryEvent[] = [
  // ── 1. 开拓许可 ──
  {
    id: 'intro_01',
    title: '开拓许可',
    trigger: 'init',
    condition: {},
    priority: 100,
    repeatable: false,
    flagOnStart: 'intro_01_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '你手中的灵材与灵石，是起点，也是唯一可用的本钱。\n\n天灾后的碎片疆域上，商会如野草般生灭。你领到的开拓许可期限有限，在那之前，是建起横跨诸地的商路、让商会名号传遍七十二城，还是灰溜溜地在期限到来前清账离场——全看你自己。\n\n飞舟已泊在码头，地图上尚有大片迷雾。第一步怎么走，你来定。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_01_done' }],
  },

  // ── 2. 城镇一览 ──
  {
    id: 'intro_02',
    title: '城镇一览',
    trigger: 'init',
    condition: { flagsRequired: ['intro_01_done'], flagsBlocked: ['intro_02_done'] },
    priority: 99,
    repeatable: false,
    flagOnStart: 'intro_02_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '你所在的据点是一座城镇——这里是你的行动枢纽。\n\n• 酒馆（知客亭/营地）：可以打听新据点和道路传闻，也能接取或交付委托。\n• 交易所：买卖本地特产，低买高卖赚取差价。\n• 城主府（分号所在地）：已设立分号的城镇可在此开设商会，管理商路与产业。\n\n先去酒馆或交易所看看，熟悉一下环境吧。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_02_done' }],
  },

  // ── 3. 启程资金 ──
  {
    id: 'intro_03',
    title: '启程资金',
    trigger: 'init',
    condition: { flagsRequired: ['intro_02_done'], flagsBlocked: ['intro_03_done'] },
    priority: 98,
    repeatable: false,
    flagOnStart: 'intro_03_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '商会账上虽有些底子，但跑商周转总归需要更多灵石。会长助理特批了一笔额外资金，已划入商会账册。\n\n省着点花——飞舟维护、供奉酬劳、货物押金，处处都要灵石。',
        choices: [{ label: '收下灵石（+200）', effects: [{ type: 'add_spirit_stone', amount: 200 }] }],
      },
    ],
    onComplete: [
      { type: 'set_flag', flag: 'intro_03_done' },
      { type: 'set_flag', flag: 'intro_complete' },
    ],
  },
]
