import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const airshipEvents: StoryEvent[] = [
  {
    id: 'intro_airship',
    title: '飞舟总览',
    trigger: 'arrive',
    condition: { flagsBlocked: ['intro_airship_done'] },
    priority: 50,
    repeatable: false,
    flagOnStart: 'intro_airship_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '飞舟是你的移动总部，可在此查看商会资产。\n\n• 行囊：查看随身携带的货物与道具。\n• 改造：消耗灵石升级飞舟的货仓容量、移动范围和供奉席位。\n\n定期升级飞舟，才能把商路铺得更远。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_airship_done' }],
  },
]
