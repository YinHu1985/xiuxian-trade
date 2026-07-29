import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const ruinEvents: StoryEvent[] = [
  {
    id: 'intro_ruin',
    title: '遗迹探索指南',
    trigger: 'action',
    condition: { flagsBlocked: ['intro_ruin_done'] },
    priority: 50,
    triggerFilter: { actionType: 'intro_manual' },
    repeatable: false,
    flagOnStart: 'intro_ruin_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '会长，前方是一座上古遗迹。\n这种地方虽然残破，但深处往往藏着意想不到的机缘。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '看起来确实有些年头了。里面有什么？',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '据我打探到的情报，遗迹深处有一条密道，布满了禁制。\n剑气、毒气、阵法，不一而足。若能穿越过去，必有收获。\n我正好带了三种秘制之物——金甲符、避毒丹、破阵珠，\n专门应对这些禁制。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '三种禁制……确实需要准备周全。\n那如果遇到麻烦，能撤回来吗？',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '随时可以撤回入口，不会有损失。\n不过要想清楚——没有对应物品的话，强行突破会付出船员的伤亡代价。\n我建议先备好物品再深入。',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '对了，我听说有些宗门遗失了镇宗之宝，就藏在这种遗迹深处。\n若是能寻回来，那些宗门定会出大价钱。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_ruin_done' }],
  },
]
