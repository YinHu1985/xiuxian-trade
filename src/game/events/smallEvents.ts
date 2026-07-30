import type { StoryEvent } from '@/game/types'

const base = import.meta.env.BASE_URL
const characterPortraitUrl = `${base}images/portraits/char-01.webp`

export const smallEvents: StoryEvent[] = [
  // ── 1. 路遇行商 ──
  {
    id: 'encounter_trader',
    title: '路遇行商',
    trigger: 'turn_end',
    condition: { randomChance: 0.08, excludeStartingNode: true },
    priority: 30,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '行商',
        portraitUrl: characterPortraitUrl,
        content:
          '这位道友请留步！在下云游商人，途经此地。手上有些稀罕货，不知道友可有兴趣？',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '哦？什么货色，拿出来看看。',
      },
      {
        mode: 'portrait-right',
        characterName: '行商',
        portraitUrl: characterPortraitUrl,
        content:
          '（从袖中摸出两样东西）这株灵芝草，还有这枚火龙果，都是外地的好货。价格公道，要不要带上一份？',
      },
      {
        content: '你想要什么？',
        choices: [
          {
            label: '灵芝草我要了',
            effects: [
              { type: 'remove_spirit_stone', amount: 60 },
              { type: 'add_item', itemName: '灵芝草' },
            ],
          },
          {
            label: '火龙果不错',
            effects: [
              { type: 'remove_spirit_stone', amount: 40 },
              { type: 'add_item', itemName: '火龙果' },
            ],
          },
          {
            label: '不必了，赶路要紧',
          },
        ],
      },
    ],
  },

  // ── 2. 灵气潮汐 ──
  {
    id: 'encounter_spirit_tide',
    title: '灵气潮汐',
    trigger: 'turn_end',
    condition: { randomChance: 0.05, excludeStartingNode: true },
    priority: 30,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '大副',
        portraitUrl: characterPortraitUrl,
        content:
          '会长！外面灵气突然变得好浓，灵雾翻涌得厉害！是灵气潮汐！几十年才遇到一次的好机会啊！',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '确实是难得的机会。让弟兄们准备一下。',
      },
      {
        content: '如何利用这次潮汐？',
        choices: [
          {
            label: '让船员抓紧修炼',
            effects: [{ type: 'add_crew', amount: 3 }],
          },
          {
            label: '采集灵雾结晶',
            effects: [{ type: 'add_spirit_stone', amount: 80 }],
          },
          {
            label: '加固飞舟禁制，趁机修复',
            effects: [{ type: 'repair_airship' }],
          },
        ],
      },
    ],
  },

  // ── 3. 妖兽袭击 ──
  {
    id: 'encounter_beast',
    title: '妖兽袭击',
    trigger: 'turn_end',
    condition: { randomChance: 0.06, excludeStartingNode: true },
    priority: 30,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '瞭望手',
        portraitUrl: characterPortraitUrl,
        content:
          '会长！一头大妖从云层里冲出来了！好像是冲着飞舟来的！',
      },
      {
        mode: 'portrait-right',
        characterName: '大副',
        portraitUrl: characterPortraitUrl,
        content:
          '护盾被撞了一下，撑不了太久！怎么办？',
      },
      {
        content: '如何应对？',
        choices: [
          {
            label: '全员迎战！',
            effects: [{ type: 'remove_crew', amount: 5 }],
          },
          {
            label: '启动护盾硬抗',
            effects: [{ type: 'damage_airship', amount: 15 }],
          },
          {
            label: '扔灵石引开它',
            effects: [{ type: 'remove_spirit_stone', amount: 60 }],
          },
        ],
      },
    ],
  },

  // ── 4. 矿脉发现 ──
  {
    id: 'find_ore_vein',
    title: '矿脉发现',
    trigger: 'arrive',
    condition: { nodeType: 'ruin', randomChance: 0.3 },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '探路弟子',
        portraitUrl: characterPortraitUrl,
        content:
          '会长！这边！我发现了一条裸露的灵石矿脉！虽然品阶不算高，但量看起来不少。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '（走近查看矿脉）嗯，确实是一笔意外之财。',
      },
      {
        content: '如何处理？',
        choices: [
          {
            label: '全力开采',
            effects: [
              { type: 'remove_crew', amount: 3 },
              { type: 'add_spirit_stone', amount: 300 },
            ],
          },
          {
            label: '顺着矿脉探索禁制',
            effects: [
              { type: 'remove_crew', amount: 2 },
              { type: 'reveal_ruin_map' },
            ],
          },
          {
            label: '专注任务',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── 5. 飞舟故障 ──
  {
    id: 'airship_malfunction',
    title: '飞舟故障',
    trigger: 'turn_end',
    condition: { randomChance: 0.1, excludeStartingNode: true },
    priority: 30,
    repeatable: true,
    steps: [
      {
        mode: 'portrait-right',
        characterName: '轮机长',
        portraitUrl: characterPortraitUrl,
        content:
          '会长，灵枢舱出问题了！阵基上裂了一道口子，灵力传输断断续续的。',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '能修好吗？',
      },
      {
        mode: 'portrait-right',
        characterName: '轮机长',
        portraitUrl: characterPortraitUrl,
        content:
          '有材料就能修，但咱们备用的阵基材料用完了。要么花灵石买新的，要么……让弟兄们用灵力撑着走。',
      },
      {
        content: '怎么办？',
        choices: [
          {
            label: '买材料抢修',
            effects: [
              { type: 'remove_spirit_stone', amount: 80 },
              { type: 'repair_airship' },
            ],
          },
          {
            label: '让船员用灵力撑着',
            effects: [{ type: 'remove_crew', amount: 4 }],
          },
          {
            label: '减速慢行，撑到下一个据点',
            effects: [],
          },
        ],
      },
    ],
  },

  // ── 7. 酒馆奇闻 ──
  {
    id: 'tavern_rumor_special',
    title: '酒馆奇闻',
    trigger: 'action',
    condition: { randomChance: 0.2 },
    priority: 30,
    repeatable: true,
    triggerFilter: { actionType: 'tavern_listen' },
    steps: [
      {
        mode: 'portrait-right',
        characterName: '醉醺醺的老修',
        portraitUrl: characterPortraitUrl,
        content:
          '嘿，小友，过来过来……老夫告诉你一个大秘密……嗝……西北边的遗迹里，藏着上古丹尊的衣钵！',
      },
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '（坐到老修对面）那地方可有什么危险？',
      },
      {
        mode: 'portrait-right',
        characterName: '老修',
        portraitUrl: characterPortraitUrl,
        content:
          '剑气、毒瘴、阵法……三关连环。没有对应之物，去了也是送死。嘿嘿。',
      },
      {
        content: '如何应对？',
        choices: [
          {
            label: '买下他的地图',
            effects: [
              { type: 'remove_spirit_stone', amount: 50 },
              { type: 'acquire_map' },
            ],
          },
          {
            label: '当是醉话，一笑而过',
          },
        ],
      },
    ],
  },

  // ── 8. 遗迹共鸣 ──
  {
    id: 'ruin_resonance',
    title: '遗迹共鸣',
    trigger: 'arrive',
    condition: { nodeType: 'ruin', randomChance: 0.25 },
    priority: 25,
    repeatable: false,
    steps: [
      {
        mode: 'portrait-left',
        characterName: '会长',
        portraitUrl: characterPortraitUrl,
        content:
          '（腰间一热）嗯？什么东西在发烫……',
      },
      {
        mode: 'portrait-right',
        characterName: '会长助理',
        portraitUrl: characterPortraitUrl,
        content:
          '会长，您腰间的那个——好像在跟遗迹深处的东西呼应！',
      },
      {
        content: '如何行动？',
        choices: [
          {
            label: '循着感应去找',
            effects: [
              { type: 'remove_crew', amount: 2 },
              { type: 'reveal_ruin_map' },
            ],
          },
          {
            label: '办正事',
            effects: [],
          },
        ],
      },
    ],
  },
]
