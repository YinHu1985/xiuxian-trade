import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const mapEvents: StoryEvent[] = [
  {
    id: 'intro_map',
    title: '大地图指南',
    trigger: 'arrive',
    condition: { flagsBlocked: ['intro_map_done'] },
    priority: 50,
    repeatable: false,
    flagOnStart: 'intro_map_started',
    steps: [
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '在这片碎片疆域上，移动与探索是扩张商路的基础。\n\n• 移动：选中已确认道路的据点，消耗移动力前往。高移动力仅在已确认道路上生效。\n• 探索：选中仅知传闻的据点或道路，执行"探索"指令可将其确认为可用路线——每次探索固定消耗一回合。\n• 打听传闻：据点内的酒馆（知客亭/营地）可以打听新据点和新道路的消息。\n• 过回合：结束当前回合，推进商会运作、结算收入与供奉任务。\n\n先确认周边的道路和据点，摸清这片区域的底细。',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '商路是商会收入的核心来源。\n\n• 在据点间建立商路，需要占用一名供奉常驻维护。\n• 商路会将对端据点全部本地产物带入收入计算，但不进入交易所流通。\n• 城镇据点可通过提升繁荣度来加成该商路收入。\n• 注意：商路不增加交易品种类，仅增加灵石收入。\n\n供奉有限，商路需要精挑细选——连接高产出据点才是最划算的买卖。',
      },
    ],
    onComplete: [{ type: 'set_flag', flag: 'intro_map_done' }],
  },
]
