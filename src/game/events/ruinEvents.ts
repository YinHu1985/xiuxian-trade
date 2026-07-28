import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const ruinEvents: StoryEvent[] = [
  {
    id: 'intro_ruin',
    title: '遗迹探索指南',
    trigger: 'arrive',
    condition: { flagsBlocked: ['intro_ruin_done'] },
    priority: 50,
    repeatable: false,
    flagOnStart: 'intro_ruin_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '前方似乎是一座上古遗迹。这类地方虽然破败，但深处往往藏着意想不到的机缘。\n\n据我所知，遗迹深处有一条密道，内里布满了层层禁制——剑气、毒气、阵法不一而足。若能穿越过去，必有收获。\n\n● 秘道是一张多层的路径图，每一层的节点通向下一层，抵达终点即为成功。\n● 每个节点都设有禁制（剑气/毒气/阵法），可用对应的金甲符、避毒丹、破阵珠化解。\n● 若没有对应物品，也可强行突破——但要付出船员伤亡的代价。\n● 觉得不妥就及时撤回入口，下次再来。\n\n我听说有些宗门遗失了镇宗之宝，似乎就藏在这种遗迹深处。若是能寻回，那些宗门定会出大价钱。',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '对了，之前在那些宗门看到的秘制之物——金甲符、避毒丹、破阵珠——正是为了应对遗迹中的禁制而炼制的。\n\n看来这并非巧合。如果想深入探索，不妨先去相关宗门买些秘制之物备着。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_ruin_done' }],
  },
]
